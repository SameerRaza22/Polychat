"use client";
import { useChat } from "@ai-sdk/react";
import { useGetChatById } from "@/modules/chat/hooks/chat";
import { Fragment, useState, useEffect, useMemo, useRef } from "react";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";

import { Message, MessageContent } from "@/components/ai-elements/message";

import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,

  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { ModelSelector } from "@/modules/chat/components/model-selector";
import { Response } from "@/components/ai-elements/response";
import { Spinner } from "@/components/ui/spinner";

import { useAIModels } from "@/modules/ai-agent/hook/ai-agent";
import { useChatStore } from "@/modules/chat/store/chat-store";
import { useSearchParams, useRouter } from "next/navigation";

import { RotateCcwIcon, Send, Square, StopCircleIcon } from "lucide-react";

const MessageWithForm = ({ chatId }) => {
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: models, isPending: isModelLoading } = useAIModels();
  const { data, isPending } = useGetChatById(chatId);
  const { hasChatBeenTriggered, markChatAsTriggered } = useChatStore();

  const [selectedModel, setSelectedModel] = useState(data?.data?.model);
  const [input, setInput] = useState("");

  const hasAutoTriggered = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldAutoTrigger = searchParams.get("autoTrigger") === "true";

  const initialMessages = useMemo(() => {
    if (!data?.data?.messages) return [];

    return data.data.messages
      .filter((msg) => msg.content && msg.content.trim() !== "" && msg.id)
      .map((msg) => {
        try {
          const parts = JSON.parse(msg.content);

          return {
            id: msg.id,
            role: msg.messageRole.toLowerCase(),
            parts: Array.isArray(parts) ? parts : [{ type: "text", text: msg.content }],
            createdAt: msg.createdAt
          }
        } catch (error) {
          return {
            id: msg.id,
            role: msg.messageRole.toLowerCase(),
            parts: [{ type: "text", text: msg.content }],
            createdAt: msg.createdAt,
          };
        }
      })

  }, [data]);

  const { stop, messages, status, sendMessage, regenerate } = useChat({
    api: "/api/chat",

    prepareRequestBody: async (body) => {
      const resolvedMessages = await body.messages;

      return {
        ...body,
        messages: resolvedMessages.map((msg) => ({
          role: msg.role,
          parts: [
            {
              type: "text",
              text: msg.content || msg.text || ""
            }
          ]
        }))
      };
    }
  });

  useEffect(() => {
    if (data?.data?.model && !selectedModel) {
      setSelectedModel(data.data.model)
    }
  }, [data, selectedModel])


  useEffect(() => {
    if (hasAutoTriggered.current) return;
    if (!shouldAutoTrigger) return;
    if (hasChatBeenTriggered(chatId)) return;
    if (!selectedModel) return;
    if (initialMessages.length === 0) return;

    const lastMessage = initialMessages[initialMessages.length - 1];

    if (lastMessage.role !== "user") return;

    hasAutoTriggered.current = true;
    markChatAsTriggered(chatId)


    sendMessage(
      { text: null },
      {
        body: {
          model: selectedModel,
          chatId,
          skipUserMessage: true,
        },
      }
    );


    router.replace(`/chat/${chatId}`, { scroll: false })
  }, [
    shouldAutoTrigger,
    chatId,
    selectedModel,
    initialMessages,
    markChatAsTriggered,
    hasChatBeenTriggered,
    sendMessage,
    router,
  ])



  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsStreaming(true);
    setStreamingText("");

    let buffer = "";
    let timeout;

    await sendMessage(
      { text: input },
      {
        body: {
          model: selectedModel,
          chatId,
        },
        onResponse: async (response) => {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            let cleanChunk = chunk
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/"""+/g, '"');

            buffer += cleanChunk;

            setStreamingText(prev => prev + cleanChunk);
          }
          setIsStreaming(false);
        },
      }
    );

    setInput("");
  }

  const handleRetry = () => {
    regenerate()
  }

  const handleStop = () => {
    stop();
  }


  const messageToRender = [...initialMessages, ...messages]


  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full">
        <Conversation className={"h-full"}>
          <ConversationContent>
            {
              messageToRender.length === 0 ? (
                <>
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Start a conversation...
                  </div>
                </>
              ) : (
                messageToRender.map((message) => (
                  <Fragment key={message.id}>
                    {
                      message.parts.map((part, i) => {

                        console.log("FULL PART:", JSON.stringify(part, null, 2));
                        switch (part.type) {
                          case "text":
                            return (
                              <Message from={message.role} key={`${message.id}-${i}`}>
                                <MessageContent>
                                  <Response>{String(part.text || "")}</Response>
                                </MessageContent>
                              </Message>
                            );

                          case "reasoning": {
                            // Extract reasoning safely
                            const reasoningDetails =
                              part?.providerMetadata?.openrouter?.reasoning_details;

                            const reasoningText =
                              reasoningDetails && reasoningDetails.length > 0
                                ? reasoningDetails.map((d) => d.text).join("\n\n")
                                : part?.text || "No reasoning available";

                            return (
                              <Reasoning
                                key={`${message.id}-${i}`}
                                className="max-w-2xl rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 transition-all"
                              >
                                {/* HEADER (clickable toggle) */}
                                <ReasoningTrigger className="flex items-center justify-between cursor-pointer text-sm font-medium text-muted-foreground">
                                  <span>🧠 Thought for a few seconds</span>
                                </ReasoningTrigger>

                                {/* CONTENT */}
                                <ReasoningContent className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                  {reasoningText}
                                </ReasoningContent>
                              </Reasoning>
                            );
                          }
                        }
                      })
                    }
                  </Fragment>
                ))
              )

            }
            {isStreaming && (
              <Message from="assistant">
                <MessageContent>
                  <Response> {streamingText || ""}</Response>
                </MessageContent>
              </Message>
            )}
            {
              status === "streaming" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )
            }
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <PromptInput onSubmit={handleSubmit} className={"mt-4"}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
            // disabled={status === "streaming"}
            />
          </PromptInputBody>


          <PromptInputTools className={"flex items-center justify-between w-full mt-2 "}>

            <div className="flex items-center gap-2">
              {isModelLoading ? (
                <Spinner />
              ) : (
                <ModelSelector
                  models={models?.models}
                  selectedModelId={selectedModel}
                  onModelSelect={setSelectedModel}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {
                status === "streaming" ? (
                  <PromptInputButton onClick={handleStop}>
                    <StopCircleIcon size={16} />
                    <span>Stop</span>
                  </PromptInputButton>
                ) : (
                  messageToRender.length > 0 && (
                    <PromptInputButton onClick={handleRetry}>
                      <RotateCcwIcon size={16} />
                      <span>Retry</span>
                    </PromptInputButton>
                  )
                )


              }
              <PromptInputSubmit status={status} />
            </div>
          </PromptInputTools>



        </PromptInput>
      </div >
    </div >
  )
}

export default MessageWithForm
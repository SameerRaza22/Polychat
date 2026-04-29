import { convertToModelMessages, streamText, tool } from "ai";
import db from "@/lib/db";
import { MessageRole, MessageType } from "@prisma/client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";

// initialize openRouter provider
const provider = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY
});

function convertStoredMessageToUI(msg) {
    try {
        const parts = JSON.parse(msg.content)

        return {
            id: msg.id,
            role: msg.messageRole.toLowerCase(),
            parts: Array.isArray(parts) && parts.length > 0
                ? parts
                : [{ type: "text", text: msg.content }],
            createdAt: msg.createdAt
        }
    } catch (error) {
        return {
            id: msg.id,
            role: msg.messageRole.toLowerCase(),
            parts: [{ type: "text", text: msg.content }],
            createdAt: msg.createdAt
        }
    }
}

function extractPartsAsJSON(message) {
    if (message.parts && Array.isArray(message.parts)) {
        return JSON.stringify(message.parts);
    }

    const content = message.content || "";
    return JSON.stringify([{ type: "text", text: content }]);
}


export async function POST(req) {
    try {
        const { chatId, messages: newMessages, model, skipUserMessage } = await req.json();
        console.log("🔍 newMessages:", newMessages)
        console.log("🔍 typeof newMessages:", typeof newMessages)

        const previousMessages = chatId ? await db.message.findMany({
            where: { chatId },
            orderBy: {
                createdAt: "asc"
            }
        }) : [];

        const uiMessages = previousMessages.map(convertStoredMessageToUI)
            .filter(msg => msg !== null)

        const resolvedMessages =
            typeof newMessages?.then === "function"
                ? await newMessages
                : newMessages

        const normalizedNewMessages = Array.isArray(resolvedMessages)
            ? resolvedMessages
            : [resolvedMessages]
        const allUIMessages = [...uiMessages, ...normalizedNewMessages];

        const modelMessages = allUIMessages
            .map((msg) => ({
                role: msg.role,
                content:
                    msg.parts
                        ?.filter((p) => p.type === "text")
                        .map((p) => p.text)
                        .join("\n") || "",
            }))
            .filter((msg) => msg.content);


        const result = streamText({
            model: provider.chat(model),
            messages: modelMessages,
            system: CHAT_SYSTEM_PROMPT
        });

        return result.toUIMessageStreamResponse({
            sendReasoning: true,
            originalMessages: allUIMessages,
            onFinish: async ({ responseMessage }) => {
                console.log("🤖 responseMessage:", responseMessage)
                try {
                    const messagesToSave = [];

                    if (!skipUserMessage) {
                        const latestUserMessage = normalizedNewMessages[normalizedNewMessages.length - 1];

                        if (latestUserMessage?.role === "user") {
                            const userPartsJSON = extractPartsAsJSON(latestUserMessage);

                            messagesToSave.push({
                                chatId,
                                content: userPartsJSON,
                                messageRole: MessageRole.USER,
                                model,
                                messageType: MessageType.NORMAL
                            });
                        }
                    }

                    if (responseMessage) {
                        const assistantPartsJSON = extractPartsAsJSON(responseMessage);

                        messagesToSave.push({
                            chatId,
                            content: assistantPartsJSON,
                            messageRole: MessageRole.ASSISTANT,
                            model,
                            messageType: MessageType.NORMAL,
                        });
                    }
                    if (messagesToSave.length > 0) {
                        await db.message.createMany({
                            data: messagesToSave
                        });
                    }



                } catch (error) {
                    console.error("❌ Error saving messages:", error);
                }
            },
        });
    } catch (error) {
        console.error("❌ API Route Error:", error);
        return new Response(
            JSON.stringify({
                error: error.message || "Internal server error",
                details: error.toString()
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}

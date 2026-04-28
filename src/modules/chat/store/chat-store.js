import { create } from "zustand";

export const useChatStore = create((set, get) => ({
    chats: [],
    activeChatId: null,
    messages: [],

    setChats: (chats) => set({ chats }),
    setActiveChatId: (chatId) => set({ activeChatId: chatId }),
    setMessages: (messages) => set({ messages }),

    addChat: (chat) => set({ chats: [chat, ...get().chats] }),


    addMessage: (message) => set({ messages: [...get().messages, message] }),

    claerMessages: () => set({ messages: [] }),
}))
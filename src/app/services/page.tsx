'use client';
import { useState, useEffect, useRef } from "react";
import ChatInterface from "@/components/ChatInterface";
import { usePathname } from "next/navigation";

export default function ServicesBot() {
    interface ChatLogItem {
        type: 'bot' | 'user';
        message: any;
    }

    const currentPage = usePathname();

    const servicesFAQs = [
        "How to register for dormitory?",
        "How much does one credit in IT department cost?",
        "How to pay tuition fees?",
    ];

    const [inputQuestion, setInputQuestion] = useState('');
    const [chatLog, setChatLog] = useState<ChatLogItem[]>([
        { type: 'bot', message: 'Ask me anything about Hanoi University public administration service' }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const chatEnd = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatEnd.current) {
            chatEnd.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatLog]);

    const handleSubmit = (event: any) => {
        event.preventDefault();
        if (!inputQuestion.trim()) {
            return;
        }
        setChatLog(prevChatLog => [...prevChatLog, { type: 'user', message: inputQuestion }]);
        fetchDocuments(inputQuestion);
        setInputQuestion('');
    }


    const clearChat = () => {
        if (chatLog.length > 1) {
            setChatLog([{ type: 'bot', message: 'Ask me anything about Hanoi University public adminstration service' }]);
            sessionStorage.removeItem('botMessage_services');
        }
    };

    async function fetchDocuments(question: string) {
        const url = 'http://localhost:2305/hanu-chatbot/public-administration';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question }),
            });
            if (!response.ok) {
                throw new Error('Failed to fetch documents');
            }
            const docsData = await response.json();
            console.log('Documents:', docsData);
            sendMessage(question, docsData);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    }

    const sendMessage = async (question: string, docsData: any) => {

        const url = '/api/chat';
        let contextText = "";
        let systemMessage;
        let assistant;

        if (docsData && docsData.relevant_docs && docsData.relevant_docs.length > 0) {
            for (const document of docsData.relevant_docs) {
                contextText += `${document}\n`; // Assuming each document is a string
            }
        }
        // console.log(contextText);

        const storedResponses = JSON.parse(sessionStorage.getItem('botMessages_services') || '[]');
        const recentResponses = storedResponses.slice(Math.max(storedResponses.length - 5, 0));
        const hasRecentResponses = recentResponses.length > 0;

        if (docsData && docsData.relevant_docs && docsData.relevant_docs.length > 0) {
            systemMessage = `
                You are a friendly chatbot.
                ${hasRecentResponses ? 'You must refer to CONTEXT first, then HANU documents, filter all relevant content to answer the question' : 'You must refer to HANU documents'} to answer the questions.
                You respond in a concise, technically credible tone. You use the language of the question given to respond.
                If you can not find relevant information in HANU documents, say apology for not being able to answer.
                You automatically make currency exchange based on the language asked, if not provided specific currency.
            `;

            const contextContent = hasRecentResponses ? `CONTEXT: ${recentResponses}; ` : '';
            assistant = {
                role: 'assistant',
                content: `${contextContent}\nHANU documents: ${contextText}`
            };
        } else {
            systemMessage = `
                You are a friendly chatbot.
                You respond in a concise, technically credible tone.
                You use the language used in the question to respond.
            `;
            assistant = null;
        }

        const data = {
            messages: [
                {
                    role: "system",
                    content: systemMessage
                },
                {
                    role: "user",
                    content: question
                },
                assistant
            ].filter(message => message !== null)
        };

        setIsLoading(true);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Check the content type of the response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                // If the response is JSON, parse it as JSON
                const responseData = await response.json();
                sessionStorage.setItem('botMessages_services', JSON.stringify([...recentResponses, responseData.message]));
                // Assuming responseData is an object with the bot's message
                setChatLog(prevChatLog => [...prevChatLog, { type: 'bot', message: responseData.message }]);
            } else {
                // If the response is not JSON, treat it as plain text
                const responseText = await response.text();
                sessionStorage.setItem('botMessages_services', JSON.stringify([...recentResponses, responseText]));

                // Assuming responseText contains the bot's message
                setChatLog(prevChatLog => [...prevChatLog, { type: 'bot', message: responseText }]);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };




    return (
        <ChatInterface
            clearChat={clearChat}
            chatLog={chatLog}
            isLoading={isLoading}
            inputQuestion={inputQuestion}
            setInputQuestion={setInputQuestion}
            handleSubmit={handleSubmit}
            chatEnd={chatEnd}
            currentPage={currentPage}
            FAQs={servicesFAQs}
        />
    );
};

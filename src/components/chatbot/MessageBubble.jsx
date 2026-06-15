import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import { User, Bot } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Copy } from 'lucide-react';
import { toast } from "sonner";
import SpeakButton from "@/components/ai/SpeakButton";

export default function MessageBubble({ message, autoSpeak = true }) {
    if (!message || !message.content) {
        return null;
    }

    const isUser = message.role === 'user';
    
    return (
        <div 
            className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}
            role="article"
            aria-label={`${isUser ? 'Nutzer' : 'Assistent'} Nachricht: ${message.content.substring(0, 50)}...`}
        >
            {!isUser && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center mt-0.5 border border-gray-700">
                    <Bot className="w-5 h-5 text-cyan-400" />
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                <div 
                    className={cn(
                        "rounded-2xl px-4 py-2.5 shadow-md transition-all duration-150",
                        isUser 
                            ? "bg-blue-600 text-white rounded-br-lg" 
                            : "bg-gray-700/80 border border-gray-600/50 backdrop-blur-sm text-gray-200 rounded-bl-lg"
                    )}
                    role={isUser ? "status" : "presentation"}
                    aria-live={isUser ? "off" : "polite"}
                    aria-atomic="true"
                >
                    {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div 
                            role="status" 
                            aria-live="polite" 
                            aria-atomic="false"
                            className="animate-in fade-in"
                        >
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            components={{
                                code: ({ inline, className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <div className="relative group/code my-2">
                                            <pre className="bg-gray-900 text-gray-200 rounded-lg p-3 overflow-x-auto">
                                                <code className={className} {...props}>{children}</code>
                                            </pre>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-gray-800 hover:bg-gray-700"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                    toast.success('Code kopiert');
                                                }}
                                            >
                                                <Copy className="h-3 w-3 text-gray-400" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                            {children}
                                        </code>
                                    );
                                },
                                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                            }}
                        >
                            {message.content}
                            </ReactMarkdown>
                            <div className="mt-1 -mb-1 -ml-2">
                                <SpeakButton text={message.content} autoPlay={autoSpeak} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
             {isUser && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center mt-0.5 border border-gray-500">
                    <User className="w-5 h-5 text-gray-300" />
                </div>
            )}
        </div>
    );
}
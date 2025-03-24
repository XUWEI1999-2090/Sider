
// API handling functions
async function chatWithMemory(messages, isMultimodal = false) {
    const apiEndpoint = isMultimodal
        ? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        : "https://api.siliconflow.cn/v1/chat/completions";

    const apiKey = isMultimodal
        ? process.env.DASHSCOPE_API_KEY 
        : process.env.SILICON_API_KEY;

    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };

    const model = isMultimodal
        ? "qwen2.5-vl-7b-instruct"
        : "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B";

    try {
        console.log("Calling " + (isMultimodal ? "Qwen" : "DeepSeek") + " API...");

        const requestBody = {
            model: model,
            messages: messages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 0.7
        };

        const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = "";
        let reasoningContent = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                const jsonStr = line.startsWith('data: ') ? line.slice(6) : line;
                
                if (jsonStr === "[DONE]") continue;
                
                try {
                    const chunk = JSON.parse(jsonStr);
                    
                    if (chunk.choices && chunk.choices.length > 0) {
                        if (chunk.choices[0].delta && chunk.choices[0].delta.content) {
                            const output = chunk.choices[0].delta.content;
                            process.stdout.write(output);
                            content += output;
                        }
                        
                        if (chunk.choices[0].delta && chunk.choices[0].delta.reasoning_content) {
                            const output = chunk.choices[0].delta.reasoning_content;
                            process.stdout.write(output);
                            reasoningContent += output;
                        }
                    }
                } catch (error) {
                    console.error("Error parsing chunk:", error);
                }
            }
        }

        messages.push({ "role": "assistant", "content": content });
        return messages;
    } catch (error) {
        console.error("Error fetching API response:", error);
        throw error;
    }
}

export { chatWithMemory };

// chat.js
// 删除了 CryptoJS，直接使用 Bearer 认证，不需要签名
const file = require("./file.js");
const { readFile, historyFileName } = require("./file.js");

async function translate(query, source_lang, target_lang, translate_text, completion) {
    try {
        const apiKey = $option.api_key;
        const url = "https://models.sjtu.edu.cn/api/v1/chat/completions";

        // 模式判定
        let mode = $option.mode;
        const configValue = readFile();
        if (configValue.mode) {
            mode = configValue.mode;
        }
        // 模型判定（自定义模型优先）
        let model = $option.custom_model_name || $option.model || "deepseek-chat";
        const prompt = $option.prompt;

        let messages = [];
        if (mode === 'translate') {
            const userMsg = `Please translate the following text into ${target_lang}. Respond only with the translated text, no extra content.\n\nText to translate:\n${translate_text}`;
            messages = [{ role: "user", content: userMsg }];
        } else if (mode === 'polishing') {
            const userMsg = `请润色以下内容（保持原意，仅改进表达）：\n${translate_text}`;
            messages = [{ role: "user", content: userMsg }];
        } else if (mode === 'custom_prompt') {
            const userMsg = prompt ? `${prompt}\n${translate_text}` : translate_text;
            messages = [{ role: "user", content: userMsg }];
        } else { // conversation 模式
            // 加载历史消息
            const history = readFile(historyFileName);
            messages = history.concat([{ role: "user", content: translate_text }]);
        }

        // 构建请求体
        const body = {
            model: model,
            messages: messages,
            temperature: 1,
            presence_penalty: 0,
            stream: false
        };

        const resp = await $http.request({
            method: "POST",
            url: url,
            header: {
                "Authorization": "Bearer " + apiKey,
                "Content-Type": "application/json"
            },
            body: body,
            timeout: 120
        });

        // 解析响应
        if (resp.data && resp.data.choices && resp.data.choices.length > 0) {
            const resultContent = resp.data.choices[0].message.content;
            // 使用 completion 返回结果以便流式或非流式统一
            completion({
                result: {
                    from: query.detectFrom,
                    to: query.detectTo,
                    toParagraphs: resultContent.split('\n')
                }
            });
            // 对话模式保存记录
            if (mode === 'conversation') {
                const newHistory = messages.concat([{ role: "assistant", content: resultContent }]);
                file.writeFile({
                    value: newHistory,
                    fileName: file.historyFileName
                });
            }
            return resultContent;
        } else if (resp.data && resp.data.error) {
            const errMsg = resp.data.error.message || JSON.stringify(resp.data.error);
            completion({
                error: {
                    type: "api",
                    message: "API 错误: " + errMsg,
                    addition: JSON.stringify(resp.data)
                }
            });
        } else {
            completion({
                error: {
                    type: "unknown",
                    message: "返回数据格式异常: " + JSON.stringify(resp.data)
                }
            });
        }
    } catch (e) {
        $log.error('接口请求错误 ==> ' + JSON.stringify(e));
        completion({
            error: {
                type: "network",
                message: "接口请求错误 - " + e.message || JSON.stringify(e)
            }
        });
        throw e;
    }
}

exports.translate = translate;
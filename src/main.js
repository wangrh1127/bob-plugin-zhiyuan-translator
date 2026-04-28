var config = require('./config.js');
var utils = require('./utils.js');
var chat = require('./chat.js');
var file = require("./file.js");
const { readFile } = require("./file.js");

function supportLanguages() {
    return config.supportedLanguages.map(([standardLang]) => standardLang);
}

function translate(query, completion) {
    (async () => {
        const targetLanguage = utils.langMap.get(query.detectTo);
        const sourceLanguage = utils.langMap.get(query.detectFrom);
        if (!targetLanguage) {
            const err = new Error();
            Object.assign(err, {
                _type: 'unsupportLanguage',
                _message: '不支持该语种',
            });
            throw err;
        }
        const source_lang = sourceLanguage || 'ZH';
        const target_lang = targetLanguage || 'EN';
        const translate_text = query.text || '';
        if (translate_text !== '') {
            // 指令处理：/mode, /switch, /clear, /reset
            const directiveResult = utils.getDirectiveResult(translate_text);
            if (directiveResult) {
                completion({
                    result: {
                        from: query.detectFrom,
                        to: query.detectTo,
                        toParagraphs: directiveResult.split('\n'),
                    },
                });
                return;
            }

            // 调用翻译（统一使用 chat.translate）
            try {
                await chat.translate(query, source_lang, target_lang, translate_text, completion);
            } catch (e) {
                Object.assign(e, {
                    _type: 'network',
                    _message: '接口请求错误 - ' + JSON.stringify(e),
                });
                throw e;
            }
        }
    })().catch((err) => {
        completion({
            error: {
                type: err._type || 'unknown',
                message: err._message || '未知错误',
                addtion: err._addtion,
            },
        });
    });
}

exports.supportLanguages = supportLanguages;
exports.translate = translate;
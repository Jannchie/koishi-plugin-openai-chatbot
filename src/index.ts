import { Context, Schema } from 'koishi'
import { Configuration, OpenAIApi } from 'openai';

export const name = 'openai-chatbot'

export interface Config {
  apiKey: string
  model: string
  prompt: string
  temperature: number
  max_tokens: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  stop: string[]
  errorMessage: string
  triggerWord: string
}
export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().required().description("OpenAI API Key: https://platform.openai.com/account/api-keys"),
  triggerWord: Schema.string().default("请问，").description("触发机器人回答的关键词。"),
  model: Schema.union(['text-davinci-003', 'text-ada-001', 'text-babbage-001', 'text-curie-001']).default('text-davinci-003'),
  prompt: Schema.string().default(`以下是与一个人工智能助手的对话。这位助手很有帮助，很有创意，很聪明，而且非常友好。
Human: 你好。
AI: 你好，我能如何为您服务?
Human: {q}
AI:
`).description('在插入的文本的前缀，用于添加一些先置情报。'),
  temperature: Schema.number().default(0.7).description("温度，更高的值意味着模型将承担更多的风险。对于更有创造性的应用，可以尝试0.9，而对于有明确答案的应用，可以尝试0（argmax采样）。"),
  max_tokens: Schema.number().default(500).description("生成的最大令牌数。"),
  top_p: Schema.number().default(1),
  frequency_penalty: Schema.number().default(0).description('数值在-2.0和2.0之间。正值是根据到目前为止它们在文本中的现有频率来惩罚新的标记，减少模型逐字逐句地重复同一行的可能性。'),
  presence_penalty: Schema.number().default(0).description('数值在-2.0和2.0之间。正值根据新标记在文本中的现有频率对其进行惩罚，减少了模型（model）逐字重复同一行的可能性。'),
  stop: Schema.array(Schema.string()).default(["\n"]).description('生成的文本将在遇到任何一个停止标记时停止。'),
  errorMessage: Schema.string().default("回答出错了。可能是问得太快了。").description("回答出错时的提示信息。"),
})

export function apply(ctx: Context, config: Config) {
  const configuration = new Configuration({
    apiKey: config.apiKey,
  });
  const openai = new OpenAIApi(configuration);

  const prompt = config.prompt.replace(/\\n/g, "\n")
  function getPrompt(prompt: string, q: string) {
    var output = prompt.replace("{q}", q);
    return output;
  }

  ctx.on('message', (session) => {
    if (session.content.startsWith(config.triggerWord)) {
      const q = session.content.replace(config.triggerWord, '')
      openai.createCompletion({
        model: config.model,
        prompt: getPrompt(prompt, q),
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        frequency_penalty: config.frequency_penalty,
        presence_penalty: config.presence_penalty,
        stop: config.stop,
      }).then((data) => {
        session.send(data.data.choices[0].text)
      }).catch(() => {
        session.send(config.errorMessage)
      });
    }
  })
}

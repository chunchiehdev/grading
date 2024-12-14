import requests
import json

url = "https://ollama.lazyinwork.com/api/chat/completions"

payload = json.dumps({
  "model": "{{currentModel}}",
  "messages": [
    {
      "role": "system",
      "content": "You must rate your input according to the scoring criteria.\nIf the input passes the scoring criteria, the output passes the test.\n\n###example###\n<Input>\n Hi, Hello\n\n<Rubric>\nContent contains a greeting\nResponse Example:\n{pass: true, reason: \"the content contains the word 'Hello'\"}\n\n###Important remarks###\nRespond with a JSON object with the following structure: {pass: boolean, reason: string}."
    },
    {
      "role": "user",
      "content": "<Input>\n If a bone is an example of an organ, then all of the bones in the body are part of an *organ system*. Specifically, they are part of the skeletal system.\n<Rubric>\nthe input contain keyword: organ system"
    }
  ],
  "stream": False
})
headers = {
  'Content-Type': 'application/json',
  'Authorization': '••••••'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)

package ws

import "encoding/json"

func Emit(hub *Hub, event string, data any) {
	payload, _ := json.Marshal(map[string]any{
		"type": event,
		"data": data,
	})

	hub.Broadcast <- payload
}


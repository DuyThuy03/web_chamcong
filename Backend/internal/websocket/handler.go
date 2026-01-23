package ws

import "github.com/gin-gonic/gin"

func ServeWS(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := Upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		client := &Client{
			Conn: conn,
			Hub:  hub,
			Send: make(chan []byte, 256),
		}

		client.Hub.Register <- client

		go client.WritePump()
		go client.ReadPump()
	}
}
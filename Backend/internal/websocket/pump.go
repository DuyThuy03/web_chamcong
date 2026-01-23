package ws

import "log"

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			log.Println("WS read error:", err)
			break
		}
	}
}

func (c *Client) WritePump() {
	defer c.Conn.Close()

	for msg := range c.Send {
		err := c.Conn.WriteMessage(1, msg)
		if err != nil {
			break
		}
	}
}

package ws

type Hub struct {
	Clients    map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan []byte),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true

		case client := <-h.Unregister:
			h.removeClient(client)

		case message := <-h.Broadcast:
			// gửi cho tất cả connection đang mở
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					h.removeClient(client)
				}
			}
		}
	}
}

func (h *Hub) removeClient(c *Client) {
	delete(h.Clients, c)
	close(c.Send)
}
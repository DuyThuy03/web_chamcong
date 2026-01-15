package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	a,err := bcrypt.GenerateFromPassword([]byte("123"), 10)

	fmt.Println("a:",string(a))
	fmt.Println("b:",err)

}


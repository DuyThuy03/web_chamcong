package utils

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
    UserID       int    `json:"user_id"`
    Email        string `json:"email"`
    Name         string `json:"name"`
    Role         string `json:"role"`
    DepartmentID *int   `json:"department_id,omitempty"`
    jwt.RegisteredClaims
}

func GenerateToken(userID int, email, name, role string, departmentID *int, secret string, expiry time.Duration) (string, error) {
    now := time.Now()
    expiresAt := now.Add(expiry)
    
    
    
    claims := JWTClaims{
        UserID:       userID,
        Email:        email,
        Name:         name,
        Role:         role,
        DepartmentID: departmentID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(expiresAt),
            IssuedAt:  jwt.NewNumericDate(now),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, err := token.SignedString([]byte(secret))
    if err != nil {
        log.Printf("[JWT-GEN] Error signing token: %v\n", err)
        return "", err
    }
    
    log.Printf("[JWT-GEN] Token generated successfully, length: %d\n", len(tokenString))
    return tokenString, nil
}

func ValidateToken(tokenString, secret string) (*JWTClaims, error) {
  
    
    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
       
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            
            return nil, errors.New("invalid signing method")
        }
        return []byte(secret), nil
    })

    if err != nil {
    
        return nil, fmt.Errorf("parse error: %w", err)
    }

 
    if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {

        
        if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
            log.Printf("[JWT] Token has expired!\n")
            return nil, errors.New("token expired")
        }
        
        return claims, nil
    }

 
    return nil, errors.New("invalid token claims")
}
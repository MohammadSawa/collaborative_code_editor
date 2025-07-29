package org.example.sociallogin.dto;

import lombok.Data;

@Data
public  class CommentResponse {
    private Long id;

    public CommentResponse(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
}
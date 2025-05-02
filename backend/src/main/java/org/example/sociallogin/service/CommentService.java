package org.example.sociallogin.service;

import org.example.sociallogin.model.Comment;
import org.example.sociallogin.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CommentService {

    @Autowired
    private CommentRepository commentRepository;

    public Comment saveComment(Comment comment) {
        return commentRepository.save(comment);
    }

    public void deleteComment(Long id) {
        if (!commentRepository.existsById(id)) {
            throw new IllegalArgumentException("Comment with ID " + id + " not found");
        }
        commentRepository.deleteById(id);
    }
}
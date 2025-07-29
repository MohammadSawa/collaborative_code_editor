package org.example.sociallogin.contorller;


import org.example.sociallogin.dto.CommentRequest;
import org.example.sociallogin.dto.CommentResponse;
import org.example.sociallogin.dto.DeleteCommentRequest;
import org.example.sociallogin.model.Comment;
import org.example.sociallogin.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/comments")
public class CommentController {


    @Autowired
    private CommentService commentService;

    @PostMapping("/save")
    public ResponseEntity<?> saveComment(@RequestBody CommentRequest request) {
        try {
            Comment comment = new Comment(null,request.getFilePath(), request.getLine(), request.getText());
            Comment savedComment = commentService.saveComment(comment);
            return ResponseEntity.ok(new CommentResponse(savedComment.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to save comment: " + e.getMessage());
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deleteComment(@RequestBody DeleteCommentRequest request) {
        try {
            commentService.deleteComment(request.getId());
            return ResponseEntity.ok("Comment deleted successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to delete comment: " + e.getMessage());
        }
    }
}

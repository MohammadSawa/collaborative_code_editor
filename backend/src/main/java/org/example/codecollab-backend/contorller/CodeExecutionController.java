package org.example.sociallogin.contorller;


import org.example.sociallogin.dto.CodeRequest;
import org.example.sociallogin.dto.CodeResponse;

import org.example.sociallogin.service.ExecutionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/code")
public class CodeExecutionController {

    private final ExecutionService executionService;
    @Autowired
    public CodeExecutionController(ExecutionService executionService) {
        this.executionService = executionService;
    }

    @PostMapping("/execute")
    public ResponseEntity<CodeResponse> runCode(@RequestBody CodeRequest request) {
        try {
            String fileName = request.getFileName();
            String className;
            if (fileName.lastIndexOf(".") != -1) {
                className = fileName.substring(0, fileName.lastIndexOf("."));
            }
            else {
                className = fileName;
            }

            String output = executionService.runCodeInDocker(request.getLanguage(),request.getCode(), request.getInput(),className);

            return ResponseEntity.ok(new CodeResponse(output));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new CodeResponse("Execution failed: " + e.getMessage()));
        }
    }
}

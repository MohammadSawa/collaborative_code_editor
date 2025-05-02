package org.example.sociallogin.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FileUpdateRequestDTO {
    private String content;
    @Size(max = 255, message = "Filename too long")
    private String newFileName;

}

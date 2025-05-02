package org.example.sociallogin.service;

import org.springframework.stereotype.Service;

import java.io.*;
import java.util.Arrays;
import java.util.List;

@Service
public class ExecutionService {

    private final CodeExecutionStrategyFactory factory;

    public ExecutionService(CodeExecutionStrategyFactory factory) {
        this.factory = factory;
    }

    public String runCodeInDocker(String language, String code, String inputData, String className) throws IOException, InterruptedException {
        CodeExecutionStrategy strategy = factory.getStrategy(language);

        String filename = strategy.getFilename(className);
        String image = strategy.getImage();
        String containerCmd = strategy.getContainerCommand(filename, className);

        File codeFile = new File(filename);
        try (FileWriter writer = new FileWriter(codeFile)) {
            writer.write(code);
        }

        List<String> command = Arrays.asList(
                "docker", "run", "--rm", "-i",
                "-v", codeFile.getAbsolutePath() + ":/app/" + filename,
                image,
                "bash", "-c", containerCmd
        );

        ProcessBuilder builder = new ProcessBuilder(command);
        builder.redirectErrorStream(true);
        Process process = builder.start();

        try (BufferedWriter inputWriter = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()))) {
            inputWriter.write(inputData);
            inputWriter.flush();
        }

        StringBuilder output = new StringBuilder();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        int exitCode = process.waitFor();
        output.append("Exit code: ").append(exitCode).append("\n");

        codeFile.delete();
        return output.toString();
    }
}

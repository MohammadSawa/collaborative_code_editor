package org.example.sociallogin.service;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class CodeExecutionStrategyFactory {
    private final Map<String, CodeExecutionStrategy> strategies;

    public CodeExecutionStrategyFactory(List<CodeExecutionStrategy> strategyList) {
        strategies = new HashMap<>();
        strategyList.forEach(strategy -> {
            if (strategy instanceof PythonExecutionStrategy) strategies.put("python", strategy);
            else if (strategy instanceof JavaExecutionStrategy) strategies.put("java", strategy);
            else if (strategy instanceof CppExecutionStrategy) strategies.put("cpp", strategy);
        });
    }

    public CodeExecutionStrategy getStrategy(String language) {
        CodeExecutionStrategy strategy = strategies.get(language.toLowerCase());
        if (strategy == null) throw new IllegalArgumentException("Unsupported language");
        return strategy;
    }
}

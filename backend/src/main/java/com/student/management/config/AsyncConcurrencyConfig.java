package com.student.management.config;

import com.student.management.shared.context.TenantContext;
import com.student.management.shared.context.TenantContextHolder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.task.TaskDecorator;
import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Enterprise Asynchronous Execution Configuration.
 * Configures high-capacity thread executor with TaskDecorator to safely
 * propagate TenantContext to background worker threads with guaranteed cleanup.
 * Implements AsyncConfigurer to ensure all @Async operations default to this decorated executor.
 */
@Configuration
@EnableAsync
public class AsyncConcurrencyConfig implements AsyncConfigurer {

    @Primary
    @Bean(name = {"taskExecutor", "tenantTaskExecutor"})
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(16);
        executor.setMaxPoolSize(64);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("TenantWorker-");
        // CallerRunsPolicy: Prevents request drops if queue fills up under peak load
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setTaskDecorator(new TenantContextTaskDecorator());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    public static class TenantContextTaskDecorator implements TaskDecorator {
        @Override
        @NonNull
        public Runnable decorate(@NonNull Runnable runnable) {
            // Step 1: Capture context from calling thread at TASK SUBMISSION TIME
            TenantContext callerContext = TenantContextHolder.getContext();
            return () -> {
                try {
                    // Step 2: Establish context inside worker thread at TASK EXECUTION TIME
                    if (callerContext != null) {
                        TenantContextHolder.setContext(callerContext);
                    }
                    runnable.run();
                } finally {
                    // Step 3: Guaranteed cleanup to prevent thread reuse pollution
                    TenantContextHolder.clear();
                }
            };
        }
    }
}


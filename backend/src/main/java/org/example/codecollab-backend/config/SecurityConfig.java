package org.example.sociallogin.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final JwtAuthEntryPoint authEntryPoint;
    public SecurityConfig(OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler, JwtAuthEntryPoint authEntryPoint) {
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
        this.authEntryPoint = authEntryPoint;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(
                            "/",
                            "/login",
                            "/logout",
                            "/index.html",
                            "/index",
                            "/favicon.ico",
                            "/assets/**",
                            "/static/**"
                    ).permitAll();
                    auth.anyRequest().authenticated();
                })
                .oauth2Login(oauth2 -> oauth2
                        .successHandler(oAuth2LoginSuccessHandler)
                        .defaultSuccessUrl("/workspaces", true)
                )
                .formLogin(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authEntryPoint)
                )
                .logout(logout -> logout.logoutSuccessUrl("/"))
                .csrf(csrf-> csrf.disable()); // Only disable CSRF if you're strictly API-driven (frontend handles protection)

        return http.build();
    }

}
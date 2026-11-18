package com.example.board.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

@Configuration
public class SecurityConfig {
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http.authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
        .csrf(csrf -> csrf.csrfTokenRepository(new HttpSessionCsrfTokenRepository()))
        .formLogin(form -> form.disable())
        .httpBasic(basic -> basic.disable())
        .logout(logout -> logout.disable())
        .exceptionHandling(
            errors ->
                errors.accessDeniedHandler(
                    (request, response, exception) -> {
                      response.setStatus(403);
                      response.setContentType("application/json;charset=UTF-8");
                      response
                          .getWriter()
                          .write("{\"message\":\"요청을 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.\"}");
                    }))
        .build();
  }

  @Bean
  org.springframework.security.core.userdetails.UserDetailsService unusedBasicAuthentication() {
    return username -> {
      throw new org.springframework.security.core.userdetails.UsernameNotFoundException(
          "Session authentication only");
    };
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}

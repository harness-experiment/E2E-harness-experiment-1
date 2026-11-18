package com.example.board.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
  @Bean
  OpenAPI boardApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("회원 게시판 API")
                .version("1.0")
                .description(
                    "동일 출처 서버 세션 인증. 변경 요청 전 GET /api/auth/csrf로 토큰을 받고 X-CSRF-TOKEN 헤더로 전달합니다. 로그인은 세션 ID를 교체하고 로그아웃은 현재 세션을 무효화합니다."))
        .components(
            new Components()
                .addSecuritySchemes(
                    "session",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.COOKIE)
                        .name("JSESSIONID"))
                .addSecuritySchemes(
                    "csrf",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.HEADER)
                        .name("X-CSRF-TOKEN")));
  }

  @Bean
  OpenApiCustomizer errorContracts() {
    return api ->
        api.getPaths()
            .forEach(
                (path, item) ->
                    item.readOperationsMap()
                        .forEach(
                            (method, operation) -> {
                              if (!path.startsWith("/api/")) return;
                              operation
                                  .getResponses()
                                  .addApiResponse("400", error("필수 입력 또는 형식 오류"));
                              if (!method.name().equals("GET")) {
                                var requirement = new SecurityRequirement().addList("csrf");
                                if (path.startsWith("/api/posts")) requirement.addList("session");
                                operation.addSecurityItem(requirement);
                                operation
                                    .getResponses()
                                    .addApiResponse("403", error("CSRF 검증 실패 또는 작성자 권한 없음"));
                              }
                              if (path.equals("/api/auth/me"))
                                operation.addSecurityItem(
                                    new SecurityRequirement().addList("session"));
                              if (path.equals("/api/auth/me")
                                  || path.equals("/api/auth/login")
                                  || (path.startsWith("/api/posts")
                                      && !method.name().equals("GET"))) {
                                operation
                                    .getResponses()
                                    .addApiResponse("401", error("인증 실패 또는 로그인 필요"));
                              }
                              if (path.contains("{id}"))
                                operation.getResponses().addApiResponse("404", error("글 없음"));
                              if (path.endsWith("signup"))
                                operation.getResponses().addApiResponse("409", error("중복 이메일"));
                            }));
  }

  private ApiResponse error(String description) {
    return new ApiResponse()
        .description(description)
        .content(
            new Content()
                .addMediaType(
                    "application/json",
                    new MediaType()
                        .schema(new ObjectSchema().addProperty("message", new StringSchema()))));
  }
}

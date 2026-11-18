package com.example.board.post;

import java.time.OffsetDateTime;

public record Post(
    long id,
    long authorId,
    String authorEmail,
    String title,
    String body,
    OffsetDateTime createdAt) {}

package com.sakuraverse.backend.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.util.Date;

@Data
@Document(indexName = "blog_posts")
public class PostDocument {
    @Id
    private Long id;

    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String title;

    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String excerpt;

    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String content;

    @Field(type = FieldType.Keyword)
    private String category;
    
    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String[] tags;

    // Added for sorting
    @Field(type = FieldType.Integer)
    private Integer likes;

    // Added for sorting
    @Field(type = FieldType.Date)
    private Date createTime;
}
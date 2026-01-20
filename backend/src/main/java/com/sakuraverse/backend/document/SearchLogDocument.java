package com.sakuraverse.backend.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.util.Date;

@Data
@Document(indexName = "search_logs")
public class SearchLogDocument {
    @Id
    private String id;

    // Use Keyword type for exact aggregation (counting exact phrases)
    @Field(type = FieldType.Keyword)
    private String keyword;

    @Field(type = FieldType.Date)
    private Date searchTime;
}
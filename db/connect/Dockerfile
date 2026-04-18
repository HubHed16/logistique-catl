FROM quay.io/debezium/connect:2.7

# Le connecteur PostgreSQL Debezium est déjà inclus dans cette image.
# On ajoute le connecteur ClickHouse Kafka Connect (officiel ClickHouse Inc.)

USER root

ARG CH_CONNECT_VERSION=1.2.5

RUN microdnf install -y unzip && \
    mkdir -p /kafka/connect/clickhouse-kafka-connect && \
    curl -fsSL \
      "https://github.com/ClickHouse/clickhouse-kafka-connect/releases/download/v${CH_CONNECT_VERSION}/clickhouse-kafka-connect-v${CH_CONNECT_VERSION}.zip" \
      -o /tmp/ch.zip && \
    unzip /tmp/ch.zip -d /tmp/ch && \
    find /tmp/ch -name "*.jar" -exec cp {} /kafka/connect/clickhouse-kafka-connect/ \; && \
    rm -rf /tmp/ch /tmp/ch.zip && \
    microdnf clean all

USER 1001

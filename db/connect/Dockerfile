FROM quay.io/debezium/connect:2.7

# Le connecteur PostgreSQL Debezium est déjà inclus dans cette image.
# On ajoute le connecteur JDBC Kafka Connect (Confluent) + driver MSSQL.

USER root

ARG JDBC_CONNECT_VERSION=10.7.6
ARG MSSQL_DRIVER_VERSION=12.6.1.jre11

RUN microdnf install -y unzip && \
    mkdir -p /kafka/connect/kafka-connect-jdbc && \
    curl -fsSL \
      "https://d1i4a15mxbxib1.cloudfront.net/api/plugins/confluentinc/kafka-connect-jdbc/versions/${JDBC_CONNECT_VERSION}/confluentinc-kafka-connect-jdbc-${JDBC_CONNECT_VERSION}.zip" \
      -o /tmp/jdbc.zip && \
    unzip /tmp/jdbc.zip -d /tmp/jdbc && \
    cp /tmp/jdbc/confluentinc-kafka-connect-jdbc-${JDBC_CONNECT_VERSION}/lib/*.jar /kafka/connect/kafka-connect-jdbc/ && \
    curl -fsSL \
      "https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/${MSSQL_DRIVER_VERSION}/mssql-jdbc-${MSSQL_DRIVER_VERSION}.jar" \
      -o /kafka/connect/kafka-connect-jdbc/mssql-jdbc.jar && \
    rm -rf /tmp/jdbc /tmp/jdbc.zip && \
    microdnf clean all

USER 1001

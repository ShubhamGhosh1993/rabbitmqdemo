require("dotenv").config();
const amqp = require("amqplib");
const mysql = require("mysql2/promise");
const { logSchema } = require("./helpers/validator");

// RabbitMQ configuration
const rabbitMQConfig = {
  host: process.env.MQ_HOST,
  port: process.env.MQ_PORT,
  username: process.env.MQ_USERNAME,
  password: process.env.MQ_PASSWORD,
  exchangeName: process.env.MQ_EXCHANGE,
  queueName: process.env.MQ_QUEUENAME,
  routingKey: process.env.MQ_ROUTINGKEY,
};

// MySQL configuration
const mysqlConfig = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

console.log("RB MQ : ", rabbitMQConfig);
console.log("MySQL : ", mysqlConfig);

async function start() {
  // Connect to RabbitMQ
  const connection = await amqp.connect(
    `amqp://${rabbitMQConfig.host}:${rabbitMQConfig.port}`,
    {
      username: rabbitMQConfig.username,
      password: rabbitMQConfig.password,
    }
  );
  const channel = await connection.createChannel();

  // Create a queue
  const queue = await channel.assertQueue(rabbitMQConfig.queueName, {
    durable: false,
  });

  // Bind the queue to the exchange with a routing key
  await channel.bindQueue(
    queue.queue,
    rabbitMQConfig.exchangeName,
    rabbitMQConfig.routingKey
  );

  // Connect to MySQL
  const mysqlPool = await mysql.createPool(mysqlConfig);

  // Consume messages from RabbitMQ
  channel.consume(queue.queue, async (msg) => {
    const message = msg.content.toString();
    console.log(msg);
    console.log("RB MQ", message);
    // console.log("RB MQ");
    // const { joierror, joivalue } = logSchema.validate(message);

    // console.log("JOI Error:", joierror);
    // console.log("JOI value", joivalue);

    try {
      const [results, fields] =
        await mysqlPool.query(`CREATE TABLE IF NOT EXISTS logger (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        level ENUM('INFO', 'WARNING', 'ERROR', 'DEBUG') DEFAULT 'INFO',
        message TEXT,
        user_id INT,
        request_id VARCHAR(50),
        ip_address VARCHAR(15),
        user_agent VARCHAR(255),
        additional_info JSON,
        INDEX ix_logs_level (level), 
        INDEX ix_logs_user_id (user_id),
        INDEX ix_logs_request_id (request_id)
    );`);
    } catch (error) {
      throw error;
    }

    // Insert the message into MySQL
    try {

      const [results, fields] = await mysqlPool.query(
        `INSERT INTO logger (message) VALUES ('${message}')`
      );
      console.log("Message inserted into MySQL:", results);
    } catch (error) {
      throw error;
    }

    // Acknowledge the message in RabbitMQ
    channel.ack(msg);
  });
}

// Start the message listener
start();

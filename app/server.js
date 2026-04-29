const express = require('express');
const app = express();
const PORT = 3000;

// Prometheus metrics
const client = require('prom-client');

// Создаём Registry (хранилище метрик)
const register = new client.Registry();  // ✅ Добавлен new

// Метрика 1: Counter для HTTP запросов
const httpRequestsTotal = new client.Counter({  // ✅ Добавлен new
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register]
});

// Метрика 2: Histogram для времени ответа
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Метрика 3: Gauge для активных запросов
const activeRequests = new client.Gauge({
  name: 'active_requests',
  help: 'Number of requests currently being processed',
  registers: [register]
});

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для сбора метрик
app.use((req, res, next) => {
  const start = Date.now();
  
  // Увеличиваем счётчик активных запросов
  activeRequests.inc();
  
  // Когда ответ отправлен
  res.on('finish', () => {
    // Уменьшаем счётчик активных запросов
    activeRequests.dec();
    
    // Вычисляем время обработки
    const duration = (Date.now() - start) / 1000;
    
    // Записываем метрики
    const endpoint = req.route ? req.route.path : req.path;
    
    httpRequestsTotal.inc({
      method: req.method,
      endpoint: endpoint,
      status: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      endpoint: endpoint
    }, duration);
  });
  
  next();
});

// Простое хранилище задач (в памяти)
let tasks = [
  { id: 1, title: 'Learn Docker', completed: false },
  { id: 2, title: 'Learn Prometheus', completed: false },
  { id: 3, title: 'Learn Grafana', completed: false }
];

// Endpoint: GET /tasks - получить все задачи
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// Endpoint: POST /tasks - создать задачу
app.post('/tasks', (req, res) => {
  const newTask = {
    id: tasks.length + 1,
    title: req.body.title,
    completed: false
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// Endpoint: GET /health - healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint: GET /metrics - метрики для Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Запуск сервера (ПОСЛЕ всех endpoints)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
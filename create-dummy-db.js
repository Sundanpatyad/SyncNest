const fs = require('fs');
const initSqlJs = require('sql.js');

initSqlJs().then(function(SQL){
  const db = new SQL.Database();
  
  // Create tables
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    );
    
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      stock_quantity INTEGER DEFAULT 0
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_amount DECIMAL(10, 2) NOT NULL,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  
  // Insert Users
  db.run(`
    INSERT INTO users (name, email, role) VALUES 
      ('Alice Smith', 'alice@example.com', 'admin'),
      ('Bob Jones', 'bob@example.com', 'user'),
      ('Charlie Brown', 'charlie@example.com', 'user'),
      ('Diana Prince', 'diana@example.com', 'user'),
      ('Evan Wright', 'evan@example.com', 'user');
  `);

  // Insert Products
  db.run(`
    INSERT INTO products (name, description, price, stock_quantity) VALUES 
      ('Laptop Pro', 'High performance laptop for professionals', 1299.99, 50),
      ('Wireless Mouse', 'Ergonomic wireless mouse', 49.99, 200),
      ('Mechanical Keyboard', 'RGB mechanical keyboard with blue switches', 109.99, 150),
      ('HD Monitor', '27-inch 4K UHD monitor', 349.50, 75),
      ('Noise Cancelling Headphones', 'Over-ear bluetooth headphones', 199.00, 100);
  `);

  // Insert Orders
  db.run(`
    INSERT INTO orders (user_id, total_amount, status) VALUES 
      (2, 1349.98, 'completed'),
      (3, 49.99, 'shipped'),
      (2, 109.99, 'processing'),
      (4, 548.50, 'pending'),
      (5, 1299.99, 'completed');
  `);
  
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync('sample.sqlite', buffer);
  console.log('Dummy database "sample.sqlite" created successfully!');
});

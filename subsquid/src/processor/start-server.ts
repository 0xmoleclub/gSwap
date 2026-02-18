// Standalone entry point for the custom Apollo GraphQL server.
// Usage: node -r dotenv/config lib/processor/start-server.js

import { DataSource, DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { createServer } from './server';
import { Factory, Pool, Token } from '../model';

// Subsquid migrations use snake_case column names, matching the property names
// after camelCase → snake_case conversion.
class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    const name = customName || propertyName;
    return embeddedPrefixes.length
      ? embeddedPrefixes.join('_') + '_' + this.toSnake(name)
      : this.toSnake(name);
  }

  relationName(propertyName: string): string {
    return this.toSnake(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.toSnake(relationName) + '_' + referencedColumnName;
  }

  private toSnake(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'gswap',
    entities: [Factory, Pool, Token],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  await createServer(dataSource);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

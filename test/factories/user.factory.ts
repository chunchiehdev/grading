import { db, UserRole } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserOptions {
  email?: string;
  name?: string;
  role?: UserRole;
  picture?: string;
}

export class UserFactory {
  static async create(options: CreateUserOptions = {}) {
    const user = await db.user.create({
      data: {
        id: uuidv4(),
        email: options.email || `test-${uuidv4()}@example.com`,
        name: options.name || `Test User ${Math.floor(Math.random() * 1000)}`,
        role: options.role || UserRole.STUDENT,
        picture: options.picture || 'https://example.com/avatar.jpg',
      }
    });
    
    console.log(`👤 Created ${user.role.toLowerCase()}: ${user.email}`);
    return user;
  }
  
  static async createTeacher(options: Omit<CreateUserOptions, 'role'> = {}) {
    return this.create({ ...options, role: UserRole.TEACHER });
  }
  
  static async createStudent(options: Omit<CreateUserOptions, 'role'> = {}) {
    return this.create({ ...options, role: UserRole.STUDENT });
  }
  
  static async createMany(count: number, options: CreateUserOptions = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create({
        ...options,
        email: options.email ? `${i}-${options.email}` : undefined,
        name: options.name ? `${options.name} ${i + 1}` : undefined,
      }));
    }
    return users;
  }
}
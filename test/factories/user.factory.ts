import { PrismaClient, User } from '@/types/database';

export interface CreateUserData {
  email?: string;
}

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateUserData = {}): Promise<User> {
    const userData = {
      email: data.email || `test-${Date.now()}@example.com`,
    };

    return this.prisma.user.create({
      data: userData,
    });
  }

  async createMany(count: number, baseData: CreateUserData = {}): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      const email = baseData.email ? `${i}-${baseData.email}` : `test-${Date.now()}-${i}@example.com`;
      users.push(await this.create({
        ...baseData,
        email: email,
      }));
    }
    return users;
  }
}
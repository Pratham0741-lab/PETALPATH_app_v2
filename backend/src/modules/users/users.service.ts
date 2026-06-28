import { usersRepository } from './users.repository.js';

export class UsersService {
  async getAllUsers() {
    return usersRepository.findAll();
  }

  async getUserById(id: string) {
    return usersRepository.findById(id);
  }

  async createUser(data: any) {
    return usersRepository.create(data);
  }

  async updateUser(id: string, data: any) {
    return usersRepository.update(id, data);
  }

  async deleteUser(id: string) {
    return usersRepository.delete(id);
  }
}

export const usersService = new UsersService();

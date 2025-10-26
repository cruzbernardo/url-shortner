export interface RequestRegisterUser {
  email: string;
  name: string;
  password: string;
}

export interface ResponseGetUserWithoutPassword {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

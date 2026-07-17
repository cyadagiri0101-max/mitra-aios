import 'reflect-metadata';
import { AiController } from './ai.controller';

describe('AiController RBAC metadata', () => {
  const internalRoles = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'];

  it('requires an internal role for chat', () => {
    expect(Reflect.getMetadata('roles', AiController.prototype.chat)).toEqual(internalRoles);
  });

  it('requires an internal role for entity analysis', () => {
    expect(Reflect.getMetadata('roles', AiController.prototype.analyze)).toEqual(internalRoles);
  });
});

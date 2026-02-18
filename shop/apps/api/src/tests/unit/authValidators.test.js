const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../../validators/authValidators');

describe('Auth Validators (Joi Schemas)', () => {
  describe('registerSchema', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'MyPassword1!',
    };

    it('should validate correct registration data', () => {
      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should set default role to customer', () => {
      const { value } = registerSchema.validate(validData);
      expect(value.role).toBe('customer');
    });

    it('should accept vendor role', () => {
      const { error } = registerSchema.validate({ ...validData, role: 'vendor' });
      expect(error).toBeUndefined();
    });

    it('should accept affiliate role', () => {
      const { error } = registerSchema.validate({ ...validData, role: 'affiliate' });
      expect(error).toBeUndefined();
    });

    it('should reject admin role for registration', () => {
      const { error } = registerSchema.validate({ ...validData, role: 'admin' });
      expect(error).toBeTruthy();
    });

    it('should require name', () => {
      const { error } = registerSchema.validate({ email: 'a@b.com', password: 'Test123!' });
      expect(error).toBeTruthy();
      expect(error.details[0].message).toContain('name');
    });

    it('should require name to be at least 2 characters', () => {
      const { error } = registerSchema.validate({ ...validData, name: 'J' });
      expect(error).toBeTruthy();
    });

    it('should require email', () => {
      const { error } = registerSchema.validate({ name: 'John', password: 'Test123!' });
      expect(error).toBeTruthy();
    });

    it('should reject invalid email', () => {
      const { error } = registerSchema.validate({ ...validData, email: 'not-email' });
      expect(error).toBeTruthy();
    });

    it('should require password', () => {
      const { error } = registerSchema.validate({ name: 'John', email: 'a@b.com' });
      expect(error).toBeTruthy();
    });

    it('should require minimum 8 character password', () => {
      const { error } = registerSchema.validate({ ...validData, password: 'Abc1!' });
      expect(error).toBeTruthy();
    });

    it('should require uppercase letter in password', () => {
      const { error } = registerSchema.validate({ ...validData, password: 'lowercase1!' });
      expect(error).toBeTruthy();
    });

    it('should require lowercase letter in password', () => {
      const { error } = registerSchema.validate({ ...validData, password: 'UPPERCASE1!' });
      expect(error).toBeTruthy();
    });

    it('should require number in password', () => {
      const { error } = registerSchema.validate({ ...validData, password: 'NoNumbers!' });
      expect(error).toBeTruthy();
    });

    it('should require special character in password', () => {
      const { error } = registerSchema.validate({ ...validData, password: 'NoSpecial123' });
      expect(error).toBeTruthy();
    });

    it('should accept complex password', () => {
      const { error } = registerSchema.validate({
        ...validData,
        password: 'C0mpl3x!P@$$w0rd',
      });
      expect(error).toBeUndefined();
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const { error } = loginSchema.validate({
        email: 'user@test.com',
        password: 'any-password',
      });
      expect(error).toBeUndefined();
    });

    it('should require email', () => {
      const { error } = loginSchema.validate({ password: '123' });
      expect(error).toBeTruthy();
    });

    it('should require valid email', () => {
      const { error } = loginSchema.validate({ email: 'bad', password: '123' });
      expect(error).toBeTruthy();
    });

    it('should require password', () => {
      const { error } = loginSchema.validate({ email: 'user@test.com' });
      expect(error).toBeTruthy();
    });

    it('should not enforce password complexity for login', () => {
      const { error } = loginSchema.validate({
        email: 'user@test.com',
        password: 'simple',
      });
      expect(error).toBeUndefined();
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate correct email', () => {
      const { error } = forgotPasswordSchema.validate({ email: 'user@test.com' });
      expect(error).toBeUndefined();
    });

    it('should require email', () => {
      const { error } = forgotPasswordSchema.validate({});
      expect(error).toBeTruthy();
    });

    it('should reject invalid email', () => {
      const { error } = forgotPasswordSchema.validate({ email: 'not-an-email' });
      expect(error).toBeTruthy();
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate correct reset data', () => {
      const { error } = resetPasswordSchema.validate({
        token: 'some-reset-token-123',
        newPassword: 'NewPassword1!',
      });
      expect(error).toBeUndefined();
    });

    it('should require token', () => {
      const { error } = resetPasswordSchema.validate({ newPassword: 'Test123!' });
      expect(error).toBeTruthy();
    });

    it('should require new password', () => {
      const { error } = resetPasswordSchema.validate({ token: 'abc' });
      expect(error).toBeTruthy();
    });

    it('should enforce strong password for new password', () => {
      const { error } = resetPasswordSchema.validate({
        token: 'abc',
        newPassword: 'weak',
      });
      expect(error).toBeTruthy();
    });
  });
});

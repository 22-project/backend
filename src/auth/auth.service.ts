import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { SignupDto, LoginDto } from './dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Tokens } from './types';
import { jwtConstants } from './constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersRepository) private usersRepository: UsersRepository,
    private jwtService: JwtService,
  ) {}

  // target 문자열을 해시해서 반환하는 메소드
  // - password와 refreshToken을 db에 저장 전 해싱 하기 위해
  async hash(target: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(target, salt);
  }

  async getAccessToken(userId: number, email: string): Promise<string> {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        email,
      },
      {
        secret: jwtConstants.at_secret,
        expiresIn: '15m',
      },
    );
  }

  async getRefreshToken(userId: number, email: string): Promise<string> {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        email,
      },
      {
        secret: jwtConstants.rt_secret,
        expiresIn: '7d',
      },
    );
  }

  // 액세스 토큰과 리프레시 토큰을 발급받아 반환하는 메소드
  async getTokens(userId: number, email: string): Promise<Tokens> {
    const [accessToken, refreshToken] = [
      await this.getAccessToken(userId, email),
      await this.getRefreshToken(userId, email),
    ];

    return {
      accessToken,
      refreshToken,
    };
  }

  async signUp(signupDto: SignupDto): Promise<void> {
    const hashedPassword = await this.hash(signupDto.password);

    return await this.usersRepository.createUser(signupDto, hashedPassword);
  }

  async login(loginDto: LoginDto): Promise<Tokens> {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email "${email}" does not exist`);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(`Password does not match`);
    }

    const tokens = await this.getTokens(user.userId, email);
    const hashedRefreshToken = await this.hash(tokens.refreshToken);
    await this.usersRepository.updateRefreshToken(
      user.userId,
      hashedRefreshToken,
    );

    return tokens;
  }

  async logout(userId: number): Promise<void> {
    const user = this.usersRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with id "${userId}" does not exist`);
    }

    await this.usersRepository.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const user = await this.usersRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" does not exist`);
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException(`Refresh token does not match`);
    }

    const tokens = await this.getTokens(user.userId, user.email);
    const hashedRefreshToken = await this.hash(tokens.refreshToken);
    await this.usersRepository.updateRefreshToken(
      user.userId,
      hashedRefreshToken,
    );

    return tokens;
  }
}

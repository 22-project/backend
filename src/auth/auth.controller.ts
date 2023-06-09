import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto';
import { Tokens } from './types';
import { GetUser, Public } from './common/decorators';
import { RefreshTokenGuard } from './guards';
import { Users } from './users.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('/signup')
  async signUp(@Body() signupDto: SignupDto): Promise<{ message: string }> {
    try {
      await this.authService.signUp(signupDto);

      return { message: '회원가입에 성공했습니다.' };
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Post('/login')
  async login(@Body() loginDto: LoginDto): Promise<Tokens> {
    try {
      return await this.authService.login(loginDto);
    } catch (err) {
      throw err;
    }
  }

  @Delete('/logout')
  async logout(@GetUser() user: Users): Promise<{ message: string }> {
    try {
      await this.authService.logout(user);

      return { message: '로그아웃 되었습니다.' };
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  async refreshAccessToken(
    @GetUser() user: Users,
    @GetUser('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const accessToken = await this.authService.refreshAccessToken(
        user,
        refreshToken,
      );

      return { accessToken };
    } catch (err) {
      throw err;
    }
  }

  @Get('/profile')
  async getMyProfile(@GetUser() user: Users): Promise<Users> {
    try {
      return await this.authService.getUserInfo(user.userId);
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Post('/gen-random-admin-users')
  async genRandomAdminUsers() {
    try {
      await this.authService.genRandomAdminUsers();
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Post('/gen-random-users')
  async genRandomUsers() {
    try {
      await this.authService.genRandomUsers(500000);
    } catch (err) {
      throw err;
    }
  }
}

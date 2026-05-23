# 🔄 JWT Strategy 调用流程详解

## 📋 完整调用链

```
前端请求
    ↓
@UseGuards(JwtAuthGuard)  ← 装饰器
    ↓
JwtAuthGuard              ← 守卫
    ↓
AuthGuard('jwt')          ← Passport 守卫
    ↓
Passport 框架              ← 查找策略
    ↓
JwtStrategy                ← 策略（你的文件）
    ↓
validate() 方法            ← 自动调用
    ↓
AuthService.validateUser() ← 获取用户信息
```

---

## 🎯 第一步：注册 Strategy

### 在 `auth.module.ts` 中注册

```23:23:backend/src/auth/auth.module.ts
  providers: [AuthService, JwtStrategy], // 注册服务和策略
```

**作用：**
- 告诉 NestJS：`JwtStrategy` 是一个可用的服务
- Passport 会自动注册这个策略，命名为 `'jwt'`

**前端类比：**
```typescript
// 前端：注册服务
const authService = new AuthService()
// 注册到某个地方，供其他地方使用

// 后端：注册策略
providers: [JwtStrategy]  // 注册到 NestJS 容器
// Passport 自动注册为 'jwt' 策略
```

---

## 🎯 第二步：Guard 使用 Strategy

### `JwtAuthGuard` 继承 `AuthGuard('jwt')`

```10:10:backend/src/auth/jwt-auth.guard.ts
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**关键点：**
- `'jwt'` 是策略的名称
- Passport 根据这个名称找到 `JwtStrategy`
- `AuthGuard('jwt')` 会自动调用名为 `'jwt'` 的策略

**前端类比：**
```typescript
// 前端：根据名称查找服务
const service = services.find(s => s.name === 'jwt')

// 后端：Passport 根据名称查找策略
AuthGuard('jwt')  // 查找名为 'jwt' 的策略 → JwtStrategy
```

---

## 🎯 第三步：路由使用 Guard

### 在 Controller 中使用

```36:40:backend/src/users/users.controller.ts
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.usersService.findAll();
  }
```

**流程：**
1. 前端请求：`GET /api/users` + `Authorization: Bearer <token>`
2. NestJS 路由匹配到 `@Get()` 方法
3. 发现 `@UseGuards(JwtAuthGuard)` 装饰器
4. 调用 `JwtAuthGuard` 的验证逻辑

---

## 🎯 第四步：Guard 调用 Strategy

### Passport 框架自动处理

当 `JwtAuthGuard` 被调用时：

```typescript
// JwtAuthGuard 内部（Passport 自动处理）
1. 查找名为 'jwt' 的策略 → 找到 JwtStrategy
2. 调用 JwtStrategy 的验证逻辑
3. 提取 Token（根据 jwtFromRequest 配置）
4. 验证 Token（根据 secretOrKey 配置）
5. 如果验证成功，调用 validate() 方法
```

**前端类比：**
```typescript
// 前端：类似中间件链
function middlewareChain(request) {
  // 1. 提取 Token
  const token = extractToken(request)
  
  // 2. 验证 Token
  const isValid = verifyToken(token)
  
  // 3. 如果有效，调用验证函数
  if (isValid) {
    const user = validateUser(token.payload)
    return user
  }
}

// 后端：Passport 自动处理
// JwtAuthGuard → Passport → JwtStrategy → validate()
```

---

## 🎯 第五步：Strategy 的 validate() 被调用

### 自动调用时机

```28:34:backend/src/auth/jwt.strategy.ts
  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return user;
  }
```

**调用时机：**
- Token 验证成功后自动调用
- `payload` = Token 中解析出的用户信息
- `payload.sub` = 用户 ID（登录时设置的）

**前端类比：**
```typescript
// 前端：验证成功后的回调
async function validateToken(token) {
  const payload = jwt.verify(token)  // 验证 Token
  if (payload) {
    return await validateUser(payload)  // 👈 类似 validate() 方法
  }
}

// 后端：自动调用
// Passport 验证成功后 → 自动调用 validate(payload)
```

---

## 📊 完整调用流程图

```
┌─────────────────────────────────────────┐
│  1. 前端发送请求                         │
│  GET /api/users                        │
│  Authorization: Bearer <token>          │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  2. NestJS 路由匹配                     │
│  @Get() + @UseGuards(JwtAuthGuard)      │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  3. JwtAuthGuard 拦截                   │
│  extends AuthGuard('jwt')               │
│  查找名为 'jwt' 的策略                  │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  4. Passport 框架处理                   │
│  - 找到 JwtStrategy                     │
│  - 调用 JwtStrategy 的验证逻辑          │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  5. JwtStrategy 验证 Token              │
│  - 提取 Token（jwtFromRequest）         │
│  - 验证签名（secretOrKey）              │
│  - 检查过期（ignoreExpiration）         │
│  - 解析 payload                         │
└──────────────┬──────────────────────────┘
               │
               ↓ (验证成功)
┌─────────────────────────────────────────┐
│  6. 自动调用 validate() 方法            │
│  async validate(payload) {              │
│    const user = await ...               │
│    return user                          │
│  }                                       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  7. 用户信息附加到 request.user          │
│  允许访问路由                            │
│  执行 findAll() 方法                    │
└─────────────────────────────────────────┘
```

---

## 🔍 关键代码位置

### 1. 注册 Strategy

```23:23:backend/src/auth/auth.module.ts
  providers: [AuthService, JwtStrategy], // 注册服务和策略
```

**作用：** 注册 `JwtStrategy`，Passport 自动命名为 `'jwt'`

---

### 2. Guard 使用 Strategy

```10:10:backend/src/auth/jwt-auth.guard.ts
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**作用：** `'jwt'` 对应 `JwtStrategy`，Passport 自动查找并调用

---

### 3. 路由使用 Guard

```36:40:backend/src/users/users.controller.ts
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.usersService.findAll();
  }
```

**作用：** 触发整个验证流程

---

### 4. Strategy 的 validate() 被调用

```28:34:backend/src/auth/jwt.strategy.ts
  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return user;
  }
```

**作用：** Token 验证成功后自动调用

---

## 💡 为什么是自动调用？

### Passport 框架的魔法

**Passport 框架内部（简化版）：**

```typescript
// Passport 内部逻辑（简化）
class PassportStrategy {
  // 当 Guard 调用时
  async authenticate(request) {
    // 1. 提取 Token（根据 jwtFromRequest 配置）
    const token = this.extractToken(request)
    
    // 2. 验证 Token（根据 secretOrKey 配置）
    const payload = this.verifyToken(token)
    
    // 3. 如果验证成功，调用 validate() 方法
    if (payload) {
      const user = await this.validate(payload)  // 👈 自动调用
      return user
    }
  }
}
```

**你的代码：**
```typescript
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {  // 👈 这个方法会被自动调用
    // ...
  }
}
```

---

## 🎯 总结：谁调用了 JwtStrategy？

### 调用链

```
1. 前端请求
   ↓
2. @UseGuards(JwtAuthGuard)  ← 装饰器触发
   ↓
3. JwtAuthGuard              ← 守卫拦截
   ↓
4. AuthGuard('jwt')           ← Passport 守卫
   ↓
5. Passport 框架              ← 查找 'jwt' 策略
   ↓
6. JwtStrategy                ← 找到你的策略
   ↓
7. Passport 自动调用          ← 提取和验证 Token
   ↓
8. validate() 方法            ← Token 验证成功后自动调用
```

### 关键点

1. **注册**：在 `auth.module.ts` 中注册为 `provider`
2. **命名**：Passport 自动命名为 `'jwt'`
3. **查找**：`AuthGuard('jwt')` 根据名称查找策略
4. **调用**：Passport 框架自动调用 `validate()` 方法

### 前端类比

```typescript
// 前端：类似事件系统
document.addEventListener('click', handleClick)  // 注册
// 当点击发生时，自动调用 handleClick

// 后端：类似策略模式
providers: [JwtStrategy]  // 注册
// 当 Guard 需要验证时，自动调用 JwtStrategy.validate()
```

---

## 🔑 核心理解

**JwtStrategy 不是被"直接"调用的，而是：**

1. **注册**：在 Module 中注册
2. **命名**：Passport 自动命名为 `'jwt'`
3. **查找**：Guard 通过名称 `'jwt'` 查找
4. **调用**：Passport 框架自动调用验证逻辑和 `validate()` 方法

**整个过程是自动的，你只需要：**
- 定义 Strategy
- 注册到 Module
- 在 Guard 中使用名称 `'jwt'`
- Passport 会自动处理剩下的

这就是 Passport 框架的强大之处！

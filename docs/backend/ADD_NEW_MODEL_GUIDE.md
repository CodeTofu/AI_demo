# 📝 添加新数据模型指南

## 🎯 核心答案

**是的！直接在 `prisma/schema.prisma` 文件中添加新的 `model` 定义即可。**

---

## 📋 完整流程

### 步骤 1：在 `schema.prisma` 中添加新模型

**编辑 `prisma/schema.prisma` 文件：**

```prisma
// 用户模型
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 👇 添加关系（可选）
  classId   Int?     // 班级 ID（可选，因为用户可能没有班级）
  class     Class?   @relation(fields: [classId], references: [id]) // 关联到 Class 模型

  @@map("users")
}

// 👇 新增：班级模型
model Class {
  id          Int      @id @default(autoincrement()) // 主键，自增
  name        String   // 班级名称
  grade        String   // 年级（如：一年级、二年级）
  teacherName  String   // 班主任姓名
  studentCount Int      @default(0) // 学生数量
  createdAt    DateTime @default(now()) // 创建时间
  updatedAt    DateTime @updatedAt // 更新时间

  // 👇 添加关系（可选）
  students     User[]   // 一个班级有多个学生

  @@map("classes") // 数据库表名
}
```

---

## 🎯 示例：添加班级模型

### 方案 1：简单模型（无关系）

**如果班级和用户暂时不需要关联：**

```prisma
// 班级模型
model Class {
  id          Int      @id @default(autoincrement())
  name        String   // 班级名称，如：一年级1班
  grade        String   // 年级，如：一年级
  teacherName  String   // 班主任姓名
  studentCount Int      @default(0) // 学生数量
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("classes")
}
```

### 方案 2：带关系的模型（推荐）

**如果班级和用户需要关联（一个班级有多个学生）：**

```prisma
// 用户模型（修改）
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 👇 添加班级关系
  classId   Int?     // 班级 ID（可选）
  class     Class?   @relation(fields: [classId], references: [id]) // 关联到 Class

  @@map("users")
}

// 班级模型（新增）
model Class {
  id          Int      @id @default(autoincrement())
  name        String   // 班级名称
  grade        String   // 年级
  teacherName  String   // 班主任姓名
  studentCount Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // 👇 添加关系：一个班级有多个学生
  students     User[]   // 一对多关系

  @@map("classes")
}
```

---

## 🚀 完整操作步骤

### 步骤 1：修改 `schema.prisma`

**在 `prisma/schema.prisma` 文件中添加新模型：**

```prisma
// ... 现有的 User 模型 ...

// 新增：班级模型
model Class {
  id          Int      @id @default(autoincrement())
  name        String
  grade        String
  teacherName  String
  studentCount Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("classes")
}
```

### 步骤 2：创建数据库迁移

**运行迁移命令：**

```bash
cd backend
npm run prisma:migrate
```

**会提示输入迁移名称，例如：**
```
? Enter a name for the new migration: add_class_model
```

**这个命令会：**
1. 检测 Schema 的变化
2. 生成 SQL 迁移文件（在 `migrations/` 目录）
3. 自动执行 SQL，在数据库中创建 `classes` 表

### 步骤 3：重新生成 Prisma Client

**迁移完成后，重新生成客户端：**

```bash
npm run prisma:generate
```

**这个命令会：**
- 根据新的 Schema 生成 TypeScript 类型
- 更新 `@prisma/client`，包含新的 `Class` 模型

### 步骤 4：在代码中使用新模型

**现在可以在 Service 中使用新模型了：**

```typescript
// src/classes/classes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  // 创建班级
  async create(createClassDto: CreateClassDto) {
    return this.prisma.class.create({
      data: createClassDto,
    });
  }

  // 查询所有班级
  async findAll() {
    return this.prisma.class.findMany();
  }

  // 根据 ID 查询班级
  async findOne(id: number) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: true, // 如果有关联，可以包含学生信息
      },
    });
  }

  // 更新班级
  async update(id: number, updateClassDto: Partial<CreateClassDto>) {
    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
    });
  }

  // 删除班级
  async remove(id: number) {
    return this.prisma.class.delete({
      where: { id },
    });
  }
}
```

---

## 📊 关系类型说明

### 1. 一对一关系（One-to-One）

**示例：用户和用户资料**

```prisma
model User {
  id      Int     @id @default(autoincrement())
  name    String
  profile Profile? // 一个用户有一个资料（可选）
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  userId Int    @unique // 唯一，确保一对一
  user   User   @relation(fields: [userId], references: [id])
}
```

### 2. 一对多关系（One-to-Many）

**示例：班级和用户（一个班级有多个学生）**

```prisma
model Class {
  id       Int    @id @default(autoincrement())
  name     String
  students User[] // 一个班级有多个学生
}

model User {
  id      Int     @id @default(autoincrement())
  name    String
  classId Int?    // 学生所属班级 ID（可选）
  class   Class?  @relation(fields: [classId], references: [id])
}
```

### 3. 多对多关系（Many-to-Many）

**示例：用户和课程（一个用户可以选择多门课程，一门课程有多个学生）**

```prisma
model User {
  id      Int      @id @default(autoincrement())
  name    String
  courses Course[] // 多对多关系
}

model Course {
  id      Int      @id @default(autoincrement())
  name    String
  students User[]  // 多对多关系
}
```

**或者使用中间表（更灵活）：**

```prisma
model User {
  id           Int            @id @default(autoincrement())
  name         String
  enrollments  Enrollment[]   // 通过中间表关联
}

model Course {
  id           Int            @id @default(autoincrement())
  name         String
  enrollments  Enrollment[]   // 通过中间表关联
}

model Enrollment {
  id        Int      @id @default(autoincrement())
  userId    Int
  courseId  Int
  enrolledAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
  course    Course   @relation(fields: [courseId], references: [id])
  
  @@unique([userId, courseId]) // 确保一个用户不能重复选同一门课
}
```

---

## 🔍 字段类型说明

### 基本类型

| Prisma 类型 | 数据库类型 | 说明 |
|------------|-----------|------|
| `String` | `TEXT` / `VARCHAR` | 字符串 |
| `Int` | `INTEGER` | 整数 |
| `Float` | `REAL` / `DOUBLE` | 浮点数 |
| `Boolean` | `BOOLEAN` | 布尔值 |
| `DateTime` | `TIMESTAMP` | 日期时间 |
| `Json` | `JSON` | JSON 数据 |

### 可选字段

**使用 `?` 表示可选：**

```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  avatar    String?  // 👈 可选字段（可以为 null）
  bio       String?  // 👈 可选字段
}
```

### 默认值

```prisma
model User {
  id        Int      @id @default(autoincrement()) // 自增
  name      String
  status    String   @default("active") // 默认值
  createdAt DateTime @default(now()) // 默认当前时间
  updatedAt DateTime @updatedAt // 自动更新时间
}
```

### 唯一索引

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique // 👈 唯一索引
  name  String
}
```

### 索引

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String
  
  @@index([name]) // 👈 为 name 字段创建索引
  @@index([email, name]) // 👈 复合索引
}
```

---

## 📝 完整示例：班级模型

### Schema 定义

```prisma
// prisma/schema.prisma

// 用户模型（修改，添加班级关系）
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 班级关系
  classId   Int?
  class     Class?   @relation(fields: [classId], references: [id])

  @@map("users")
}

// 班级模型（新增）
model Class {
  id          Int      @id @default(autoincrement())
  name        String   // 班级名称，如：一年级1班
  grade        String   // 年级，如：一年级
  teacherName  String   // 班主任姓名
  studentCount Int      @default(0) // 学生数量
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // 学生关系
  students     User[]   // 一个班级有多个学生

  @@map("classes")
}
```

### 迁移后的 SQL（自动生成）

```sql
-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- AlterTable（修改 users 表，添加 classId 字段）
ALTER TABLE "users" ADD COLUMN "classId" INTEGER;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_classId_fkey" 
FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 🎯 使用新模型的完整示例

### 1. 创建 DTO

```typescript
// src/classes/dto/create-class.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string; // 班级名称

  @IsString()
  @IsNotEmpty()
  grade: string; // 年级

  @IsString()
  @IsNotEmpty()
  teacherName: string; // 班主任姓名

  @IsInt()
  @Min(0)
  @IsOptional()
  studentCount?: number; // 学生数量（可选）
}
```

### 2. 创建 Service

```typescript
// src/classes/classes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(createClassDto: CreateClassDto) {
    return this.prisma.class.create({
      data: createClassDto,
    });
  }

  async findAll() {
    return this.prisma.class.findMany({
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: true,
      },
    });
  }

  async update(id: number, updateClassDto: Partial<CreateClassDto>) {
    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
    });
  }

  async remove(id: number) {
    return this.prisma.class.delete({
      where: { id },
    });
  }
}
```

### 3. 创建 Controller

```typescript
// src/classes/classes.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('classes')
@UseGuards(JwtAuthGuard) // 需要认证
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  async create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  async findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClassDto: Partial<CreateClassDto>,
  ) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.remove(id);
  }
}
```

---

## ✅ 验证新模型

### 1. 查看迁移文件

```bash
# 查看 migrations 目录
ls backend/prisma/migrations/
```

**应该能看到新的迁移文件，例如：**
```
migrations/
├── 20260227133849_init/
└── 20260228000000_add_class_model/  # 👈 新的迁移文件
    └── migration.sql
```

### 2. 使用 Prisma Studio 查看

```bash
npm run prisma:studio
```

**打开浏览器，应该能看到 `classes` 表。**

### 3. 测试 API

```bash
# 创建班级
POST http://localhost:3001/api/classes
Authorization: Bearer <token>
{
  "name": "一年级1班",
  "grade": "一年级",
  "teacherName": "张老师"
}

# 查询所有班级
GET http://localhost:3001/api/classes
Authorization: Bearer <token>
```

---

## 🎯 总结

### 添加新模型的步骤

1. **编辑 `schema.prisma`**
   - 添加新的 `model` 定义
   - 定义字段和关系

2. **创建迁移**
   ```bash
   npm run prisma:migrate
   ```

3. **重新生成客户端**
   ```bash
   npm run prisma:generate
   ```

4. **在代码中使用**
   - 创建 Service、Controller、DTO
   - 使用 `prisma.class.xxx()` 操作数据

### 关键点

- ✅ **直接在 `schema.prisma` 中添加模型**
- ✅ **运行迁移自动创建数据库表**
- ✅ **自动生成 TypeScript 类型**
- ✅ **支持关系定义（一对一、一对多、多对多）**

**这就是 Prisma 的强大之处：定义即生成！**

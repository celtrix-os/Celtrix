import fs from 'fs/promises';
import path from 'path';

/**
 * Helper function to find a file in a directory
 */
async function findFileInDirectory(dirPath, fileName) {
  try {
    const stats = await fs.stat(dirPath);
    
    if (!stats.isDirectory()) {
      return dirPath; // It's already a file path
    }
    
    // Common locations to search
    const possiblePaths = [
      path.join(dirPath, fileName),
      path.join(dirPath, 'config', fileName),
      path.join(dirPath, 'settings', fileName),
      path.join(dirPath, 'src', fileName),
    ];
    
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        const fileStats = await fs.stat(p);
        if (fileStats.isFile()) {
          return p;
        }
      } catch {
        continue;
      }
    }
    
    return null; // File not found
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to check if path exists and is a file
 */
async function safeReadFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      throw new Error('Path is a directory, not a file');
    }
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw error;
  }
}

/**
 * Modifies package.json to update project name and other fields
 */
export async function updatePackageJson(filePath, projectName) {
  try {
    const actualPath = await findFileInDirectory(filePath, 'package.json');
    if (!actualPath) {
      console.warn(`package.json not found in ${filePath}, skipping...`);
      return;
    }
    
    const content = await fs.readFile(actualPath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    packageJson.name = projectName;
    packageJson.version = '1.0.0';
    
    await fs.writeFile(actualPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    throw new Error(`Failed to update package.json: ${error.message}`);
  }
}

/**
 * Modifies Django settings.py file
 */
export async function modifyDjangoSettings(filePath, options = {}) {
  try {
    const actualPath = await findFileInDirectory(filePath, 'settings.py');
    if (!actualPath) {
      // Not a Django project, skip silently
      return;
    }
    
    let content = await fs.readFile(actualPath, 'utf-8');
    
    // Update SECRET_KEY if provided
    if (options.secretKey) {
      content = content.replace(
        /SECRET_KEY = .*/,
        `SECRET_KEY = '${options.secretKey}'`
      );
    }
    
    // Update DEBUG setting
    if (options.debug !== undefined) {
      content = content.replace(
        /DEBUG = .*/,
        `DEBUG = ${options.debug}`
      );
    }
    
    // Update ALLOWED_HOSTS
    if (options.allowedHosts) {
      const hostsStr = JSON.stringify(options.allowedHosts);
      content = content.replace(
        /ALLOWED_HOSTS = \[.*?\]/,
        `ALLOWED_HOSTS = ${hostsStr}`
      );
    }
    
    // Add CORS settings if needed
    if (options.enableCors) {
      if (!content.includes('corsheaders')) {
        content = content.replace(
          /INSTALLED_APPS = \[/,
          `INSTALLED_APPS = [\n    'corsheaders',`
        );
      }
      
      if (!content.includes('CorsMiddleware')) {
        content = content.replace(
          /MIDDLEWARE = \[/,
          `MIDDLEWARE = [\n    'corsheaders.middleware.CorsMiddleware',`
        );
      }
      
      if (!content.includes('CORS_ALLOWED_ORIGINS')) {
        content += `\n\n# CORS Settings\nCORS_ALLOWED_ORIGINS = [\n    'http://localhost:3000',\n    'http://localhost:5173',\n]\n`;
      }
    }
    
    // Update database settings
    if (options.database) {
      const dbConfig = JSON.stringify(options.database, null, 4);
      content = content.replace(
        /DATABASES = \{[\s\S]*?\n\}/,
        `DATABASES = ${dbConfig}`
      );
    }
    
    await fs.writeFile(actualPath, content);
  } catch (error) {
    // Silently skip if not a Django project
    if (error.message.includes('not found')) {
      return;
    }
    throw new Error(`Failed to modify Django settings: ${error.message}`);
  }
}

/**
 * Updates environment file with custom values
 */
export async function updateEnvFile(filePath, envVars = {}) {
  try {
    const actualPath = await findFileInDirectory(filePath, '.env');
    if (!actualPath) {
      console.warn(`.env not found in ${filePath}, skipping...`);
      return;
    }
    
    let content = await fs.readFile(actualPath, 'utf-8');
    
    for (const [key, value] of Object.entries(envVars)) {
      const regex = new RegExp(`${key}=.*`, 'g');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }
    
    await fs.writeFile(actualPath, content);
  } catch (error) {
    throw new Error(`Failed to update env file: ${error.message}`);
  }
}

/**
 * Renames .env.example to .env
 */
export async function createEnvFromExample(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    const actualDir = stats.isDirectory() ? dirPath : path.dirname(dirPath);
    
    const examplePath = path.join(actualDir, '.env.example');
    const envPath = path.join(actualDir, '.env');
    
    const exists = await fs.access(examplePath).then(() => true).catch(() => false);
    if (exists) {
      await fs.copyFile(examplePath, envPath);
    }
  } catch (error) {
    // Silently skip if .env.example doesn't exist
    return;
  }
}

/**
 * Updates configuration files with project-specific settings
 */
export async function updateConfigFile(filePath, updates = {}) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      console.warn(`${filePath} is a directory, skipping config update...`);
      return;
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    let updatedContent = content;
    
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`"${key}":\\s*"[^"]*"`, 'g');
      updatedContent = updatedContent.replace(regex, `"${key}": "${value}"`);
    }
    
    await fs.writeFile(filePath, updatedContent);
  } catch (error) {
    throw new Error(`Failed to update config file: ${error.message}`);
  }
}

/**
 * Replaces placeholders in files with actual values
 */
export async function replacePlaceholders(filePath, replacements = {}) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      console.warn(`${filePath} is a directory, skipping placeholder replacement...`);
      return;
    }
    
    let content = await fs.readFile(filePath, 'utf-8');
    
    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(placeholder, 'g');
      content = content.replace(regex, value);
    }
    
    await fs.writeFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to replace placeholders: ${error.message}`);
  }
}

/**
 * Updates README.md with project name
 */
export async function updateReadme(filePath, projectName) {
  try {
    const actualPath = await findFileInDirectory(filePath, 'README.md');
    if (!actualPath) {
      console.warn(`README.md not found in ${filePath}, skipping...`);
      return;
    }
    
    let content = await fs.readFile(actualPath, 'utf-8');
    
    // Replace common placeholders
    content = content.replace(/# .*/g, `# ${projectName}`);
    content = content.replace(/PROJECT_NAME/g, projectName);
    
    await fs.writeFile(actualPath, content);
  } catch (error) {
    throw new Error(`Failed to update README: ${error.message}`);
  }
}

/**
 * Batch update multiple package.json files
 */
export async function updateMultiplePackageJson(projectPath, projectName, directories = []) {
  const promises = directories.map(async (dir) => {
    const pkgPath = path.join(projectPath, dir);
    try {
      await updatePackageJson(pkgPath, `${projectName}-${dir}`);
    } catch (error) {
      console.warn(`Failed to update package.json in ${dir}: ${error.message}`);
    }
  });
  
  await Promise.all(promises);
}

/**
 * Modify Django requirements.txt
 */
export async function modifyDjangoRequirements(filePath, packages = []) {
  try {
    const actualPath = await findFileInDirectory(filePath, 'requirements.txt');
    if (!actualPath) {
      // Not a Django project, skip silently
      return;
    }
    
    let content = await fs.readFile(actualPath, 'utf-8');
    
    for (const pkg of packages) {
      if (!content.includes(pkg)) {
        content += `\n${pkg}`;
      }
    }
    
    await fs.writeFile(actualPath, content);
  } catch (error) {
    // Silently skip if not a Django project
    return;
  }
}

/**
 * Create Django requirements.txt file
 */
export async function createRequirementsTxt(dirPath, packages = []) {
  try {
    const stats = await fs.stat(dirPath);
    const actualDir = stats.isDirectory() ? dirPath : path.dirname(dirPath);
    const requirementsPath = path.join(actualDir, 'requirements.txt');
    
    // Check if requirements.txt already exists
    const exists = await fs.access(requirementsPath).then(() => true).catch(() => false);
    
    if (exists) {
      // If exists, modify it
      await modifyDjangoRequirements(requirementsPath, packages);
    } else {
      // Create new requirements.txt with default Django packages
      const defaultPackages = [
        'Django>=4.2,<5.0',
        'djangorestframework>=3.14.0',
        'django-cors-headers>=4.0.0',
        'python-decouple>=3.8',
        ...packages
      ];
      
      const content = defaultPackages.join('\n') + '\n';
      await fs.writeFile(requirementsPath, content);
    }
  } catch (error) {
    // Silently skip if there's an error
    console.warn(`Failed to create requirements.txt: ${error.message}`);
    return;
  }
}

/**
 * Create/Modify Django urls.py configuration
 */
export async function updateDjangoUrls(filePath, appName) {
  try {
    const actualPath = await findFileInDirectory(filePath, 'urls.py');
    if (!actualPath) {
      // Not a Django project or urls.py doesn't exist, skip silently
      return;
    }
    
    let content = await fs.readFile(actualPath, 'utf-8');
    
    // Add app URL pattern if not exists
    const urlPattern = `path('${appName}/', include('${appName}.urls'))`;
    if (!content.includes(urlPattern)) {
      content = content.replace(
        /urlpatterns = \[/,
        `urlpatterns = [\n    ${urlPattern},`
      );
    }
    
    await fs.writeFile(actualPath, content);
  } catch (error) {
    // Silently skip if not a Django project
    return;
  }
}

/**
 * Alias for updateDjangoUrls
 */
export async function modifyDjangoUrls(filePath, appName) {
  return updateDjangoUrls(filePath, appName);
}

/**
 * Create API boilerplate files (serializers, views, etc.)
 */
export async function createApiBoilerplate(projectPath, config = {}) {
  try {
    const stats = await fs.stat(projectPath);
    const serverPath = stats.isDirectory() ? path.join(projectPath, 'server') : path.dirname(projectPath);
    const apiPath = path.join(serverPath, 'api');
    
    // Check if api directory exists
    const apiExists = await fs.access(apiPath).then(() => true).catch(() => false);
    if (!apiExists) {
      console.warn('API directory not found, skipping API boilerplate creation...');
      return;
    }
    
    // Create serializers.py
    const serializersContent = `from rest_framework import serializers

class ExampleSerializer(serializers.Serializer):
    """
    Example serializer - replace with your actual serializers
    """
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False)
    created_at = serializers.DateTimeField(read_only=True)
`;
    await fs.writeFile(path.join(apiPath, 'serializers.py'), serializersContent);
    
    // Create views.py
    const viewsContent = `from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def health_check(request):
    """
    API health check endpoint
    """
    return Response({
        'status': 'ok',
        'message': 'API is running'
    })

# Add your ViewSets here
`;
    await fs.writeFile(path.join(apiPath, 'views.py'), viewsContent);
    
    // Create urls.py
    const urlsContent = `from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# Register your viewsets here
# router.register(r'items', views.ItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.health_check, name='health-check'),
]
`;
    await fs.writeFile(path.join(apiPath, 'urls.py'), urlsContent);
    
  } catch (error) {
    console.warn(`Failed to create API boilerplate: ${error.message}`);
    return;
  }
}

/**
 * Create authentication boilerplate files
 */
export async function createAuthBoilerplate(projectPath, config = {}) {
  try {
    const stats = await fs.stat(projectPath);
    const serverPath = stats.isDirectory() ? path.join(projectPath, 'server') : path.dirname(projectPath);
    const authPath = path.join(serverPath, 'authentication');
    
    // Check if authentication directory exists
    const authExists = await fs.access(authPath).then(() => true).catch(() => false);
    if (!authExists) {
      console.warn('Authentication directory not found, skipping auth boilerplate creation...');
      return;
    }
    
    // Create serializers.py
    const serializersContent = `from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user
`;
    await fs.writeFile(path.join(authPath, 'serializers.py'), serializersContent);
    
    // Create views.py
    const viewsContent = `from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from .serializers import UserSerializer, RegisterSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
`;
    await fs.writeFile(path.join(authPath, 'views.py'), viewsContent);
    
    // Create urls.py
    const urlsContent = `from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, UserProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
]
`;
    await fs.writeFile(path.join(authPath, 'urls.py'), urlsContent);
    
  } catch (error) {
    console.warn(`Failed to create auth boilerplate: ${error.message}`);
    return;
  }
}

/**
 * Create React API service file
 */
export async function createReactApiService(projectPath) {
  try {
    const stats = await fs.stat(projectPath);
    const clientPath = stats.isDirectory() ? path.join(projectPath, 'client') : path.dirname(projectPath);
    const srcPath = path.join(clientPath, 'src');
    
    // Check if src directory exists
    const srcExists = await fs.access(srcPath).then(() => true).catch(() => false);
    if (!srcExists) {
      console.warn('Client src directory not found, skipping API service creation...');
      return;
    }
    
    // Create services directory
    const servicesPath = path.join(srcPath, 'services');
    await fs.mkdir(servicesPath, { recursive: true });
    
    // Create api.js
    const apiContent = `import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(\`\${API_BASE_URL}/auth/token/refresh/\`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = \`Bearer \${access}\`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register/', userData),
  login: (credentials) => api.post('/auth/login/', credentials),
  getProfile: () => api.get('/auth/profile/'),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Health check
export const healthCheck = () => api.get('/health/');

export default api;
`;
    await fs.writeFile(path.join(servicesPath, 'api.js'), apiContent);
    
    // Create .env file
    const envContent = `VITE_API_URL=http://localhost:8000/api
`;
    await fs.writeFile(path.join(clientPath, '.env'), envContent);
    
  } catch (error) {
    console.warn(`Failed to create React API service: ${error.message}`);
    return;
  }
}

export default {
  updatePackageJson,
  modifyDjangoSettings,
  updateEnvFile,
  createEnvFromExample,
  updateConfigFile,
  replacePlaceholders,
  updateReadme,
  updateMultiplePackageJson,
  modifyDjangoRequirements,
  createRequirementsTxt,
  updateDjangoUrls,
  modifyDjangoUrls,
  createApiBoilerplate,
  createAuthBoilerplate,
  createReactApiService
};
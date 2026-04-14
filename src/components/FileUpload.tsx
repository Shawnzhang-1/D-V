import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string[];
  maxSize?: number;
  className?: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  fileName?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = ['.csv', '.xlsx', '.xls'],
  maxSize = 100 * 1024 * 1024,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = accept.map(ext => {
    const typeMap: Record<string, string> = {
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
    };
    return typeMap[ext] || '';
  }).filter(Boolean);

  const validateFile = useCallback((file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!accept.includes(fileExtension)) {
      return `不支持的文件类型。请上传 ${accept.join(', ')} 格式的文件。`;
    }

    if (file.size > maxSize) {
      return `文件大小超出限制。最大允许 ${(maxSize / 1024 / 1024).toFixed(0)}MB。`;
    }

    return null;
  }, [accept, maxSize]);

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    
    if (error) {
      setUploadState({
        status: 'error',
        message: error,
        fileName: file.name,
      });
      return;
    }

    setUploadState({
      status: 'success',
      message: `文件大小: ${formatFileSize(file.size)}`,
      fileName: file.name,
    });
    onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleReset = () => {
    setUploadState({
      status: 'idle',
      message: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />;
      case 'error':
        return <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer"
        style={{
          borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
          backgroundColor: isDragging ? 'var(--color-surface)' : 'var(--color-background)',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isDragging && (
          <div 
            className="absolute inset-0 rounded-2xl animate-pulse"
            style={{ background: 'var(--gradient-primary)', opacity: 0.1 }}
          />
        )}
        
        {uploadState.status === 'idle' ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div 
              className="p-4 rounded-2xl mb-4 transition-all duration-300"
              style={{
                background: isDragging ? 'var(--gradient-primary)' : 'var(--color-surface-hover)',
                boxShadow: isDragging ? 'var(--shadow-lg)' : 'none'
              }}
            >
              <Upload 
                className="w-8 h-8 transition-colors" 
                style={{ color: isDragging ? '#fff' : 'var(--color-primary)' }}
              />
            </div>
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              {isDragging ? '释放以上传文件' : '拖拽文件到此处'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>或点击选择文件</p>
            <button
              type="button"
              className="btn btn-primary"
            >
              选择文件
            </button>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              支持 CSV、Excel 格式，最大 100MB
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div 
                className="p-3 rounded-xl"
                style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-md)' }}
              >
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <p 
                  className="text-sm font-medium truncate max-w-xs"
                  style={{ color: 'var(--color-text)' }}
                >
                  {uploadState.fileName}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusIcon()}
                  <p 
                    className="text-sm"
                    style={{ 
                      color: uploadState.status === 'success' 
                        ? 'var(--color-success)' 
                        : uploadState.status === 'error' 
                          ? 'var(--color-error)' 
                          : 'var(--color-primary)'
                    }}
                  >
                    {uploadState.message}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="p-2 rounded-xl transition-colors duration-200"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="重新上传"
            >
              <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
      />

      {uploadState.status === 'error' && (
        <div 
          className="mt-3 p-4 rounded-xl border"
          style={{ 
            backgroundColor: 'rgba(var(--color-warning-rgb, 235, 203, 139), 0.2)',
            borderColor: 'var(--color-error)'
          }}
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-error)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>上传失败</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-warning)' }}>{uploadState.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

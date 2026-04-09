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
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
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
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isDragging 
            ? 'border-violet-400 bg-violet-50 scale-[1.02]' 
            : 'border-gray-200 bg-gray-50 hover:border-violet-300 hover:bg-violet-50/50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 animate-pulse" />
        )}
        
        {uploadState.status === 'idle' ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className={`
              p-4 rounded-2xl mb-4 transition-all duration-300
              ${isDragging 
                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25' 
                : 'bg-gradient-to-br from-violet-100 to-fuchsia-100'
              }
            `}>
              <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-white' : 'text-violet-500'}`} />
            </div>
            <p className="text-gray-700 font-medium mb-1">
              {isDragging ? '释放以上传文件' : '拖拽文件到此处'}
            </p>
            <p className="text-gray-400 text-sm mb-4">或点击选择文件</p>
            <button
              type="button"
              className="btn btn-primary"
            >
              选择文件
            </button>
            <p className="text-gray-400 text-xs mt-3">
              支持 CSV、Excel 格式，最大 100MB
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
                  {uploadState.fileName}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusIcon()}
                  <p className={`text-sm ${
                    uploadState.status === 'success' ? 'text-emerald-600' :
                    uploadState.status === 'error' ? 'text-red-600' :
                    'text-cyan-600'
                  }`}>
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
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
              title="重新上传"
            >
              <X className="w-5 h-5 text-gray-400" />
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
        <div className="mt-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">上传失败</p>
              <p className="text-sm text-red-600 mt-1">{uploadState.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

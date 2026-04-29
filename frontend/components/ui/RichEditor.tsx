'use client';

import { useState, useEffect, useRef } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  height?: number;
}

export default function RichEditor(props: RichEditorProps) {
  const [EditorMod, setEditorMod] = useState<{ Editor: any; Toolbar: any } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 只在客户端加载 wangEditor
    import('@wangeditor/editor-for-react').then(mod => {
      import('@wangeditor/editor/dist/css/style.css');
      setEditorMod({ Editor: mod.Editor, Toolbar: mod.Toolbar });
    });
  }, []);

  if (!mounted || !EditorMod) {
    return (
      <div style={{ height: props.height || 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        加载编辑器...
      </div>
    );
  }

  return (
    <EditorInner
      {...props}
      Editor={EditorMod.Editor}
      Toolbar={EditorMod.Toolbar}
    />
  );
}

function EditorInner({
  value, onChange, placeholder, height, Editor, Toolbar
}: RichEditorProps & { Editor: any; Toolbar: any }) {
  const [editor, setEditor] = useState<any>(null);

  const getToken = () => localStorage.getItem('imai-admin-token') || localStorage.getItem('imai-token');

  const toolbarConfig = {
    excludeKeys: ['insertVideo', 'group-video'] as any,
  };

  const editorConfig = {
    placeholder: placeholder || '请输入内容...',
    readOnly: false,
    autoFocus: false,
    MENU_CONF: {
      uploadImage: {
        server: '/api/upload/file',
        fieldName: 'file',
        headers: { Authorization: `Bearer ${getToken()}` },
        maxFileSize: 10 * 1024 * 1024,
        maxNumberOfFiles: 10,
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        customInsert(res: any, insertFn: any) {
          insertFn(res.url || res.data?.url, '', '');
        },
      },
      uploadVideo: {
        server: '/api/upload/file',
        fieldName: 'file',
        headers: { Authorization: `Bearer ${getToken()}` },
        maxFileSize: 50 * 1024 * 1024,
        customInsert(res: any, insertFn: any) {
          insertFn(res.url || res.data?.url);
        },
      },
    },
  };

  useEffect(() => {
    return () => { if (editor) editor.destroy(); };
  }, [editor]);

  return (
    <div className="w-full">
      <Toolbar editor={editor} defaultConfig={toolbarConfig} mode="default"
        style={{ borderBottom: '1px solid #e2e8f0' }} />
      <Editor
        defaultConfig={editorConfig}
        value={value}
        onCreated={setEditor}
        onChange={(editor: any) => onChange(editor.getHtml())}
        mode="default"
        style={{ height: `${height || 500}px`, overflowY: 'auto' }}
      />
    </div>
  );
}

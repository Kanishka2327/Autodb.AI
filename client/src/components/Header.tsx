import { Button } from "@/components/ui/button";
import { 
  DownloadIcon, 
  SaveIcon,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onExport: () => void;
  onSave: () => void;
}

export default function Header({ onExport, onSave }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="ml-2 text-xl font-semibold text-neutral-900">AUTODB.AI</h1>
          </div>
          <div className="flex">
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={onExport}
            >
              <DownloadIcon className="mr-1 h-4 w-4" />
              Export
            </Button>
            <Button 
              size="sm" 
              className="ml-2"
              onClick={onSave}
            >
              <SaveIcon className="mr-1 h-4 w-4" />
              Save Project
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SCHEDULE_HEADERS = [
  "Unidade",
  "Dia",
  "Início",
  "Fim",
  "Duração (min)",
  "",
];

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-7 w-40" />

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                {SCHEDULE_HEADERS.map((h, i) => (
                  <TableHead key={i}>
                    {h && <Skeleton className="h-3.5 w-16" />}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {SCHEDULE_HEADERS.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <Skeleton className="h-9 w-full" />
          </div>
        </CardContent>
      </Card>

      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="grid gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="sm:col-span-2">
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

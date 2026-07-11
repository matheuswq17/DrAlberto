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

function QuestionTableSkeleton({ showConverted = false }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Skeleton className="h-3.5 w-24" />
          </TableHead>
          <TableHead className="w-16 text-right">
            <Skeleton className="ml-auto h-3.5 w-10" />
          </TableHead>
          {showConverted && (
            <TableHead className="w-24 text-right">
              <Skeleton className="ml-auto h-3.5 w-14" />
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-6" />
            </TableCell>
            {showConverted && (
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-6" />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Loading() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(220px,1fr)_2fr]">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton
                    className="h-9 rounded-md"
                    style={{ width: `${90 - i * 25}%` }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <QuestionTableSkeleton showConverted />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <QuestionTableSkeleton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

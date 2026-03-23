import { Suspense } from "react";
import { 
  Users, 
  Target, 
  Handshake, 
  Building2, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CRMPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white/90">CRM Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10">
            Download Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white">
            Create Deal
          </Button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Total Leads
            </CardTitle>
            <Target className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">432</div>
            <p className="text-xs text-white/50">
              <span className="text-green-400 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Active Deals
            </CardTitle>
            <Handshake className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">128</div>
            <p className="text-xs text-white/50">
              <span className="text-green-400 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +5%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$45,231.89</div>
            <p className="text-xs text-white/50">
              <span className="text-green-400 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +20.1%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Avg. Deal Cycle
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">24 Days</div>
            <p className="text-xs text-white/50">
              <span className="text-red-400 font-medium inline-flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                -2%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Access Grid */}
      <h3 className="text-xl font-semibold text-white/90 pt-4">Module Access</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/crm/contacts">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Users className="h-8 w-8 text-blue-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Contacts</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Manage individual relationships</CardContent>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/crm/leads">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Target className="h-8 w-8 text-purple-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Leads</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Track business opportunities</CardContent>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/crm/deals">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Handshake className="h-8 w-8 text-green-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Deals</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Monitor your pipeline</CardContent>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/crm/companies">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader>
              <Building2 className="h-8 w-8 text-amber-400 group-hover:scale-110 transition-transform" />
              <CardTitle className="pt-2 text-white">Companies</CardTitle>
              <CardContent className="p-0 text-white/50 text-sm">Organizational unit records</CardContent>
            </CardHeader>
          </Card>
        </Link>
      </div>
      
      {/* Recent Activity (Placeholder) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <Card className="col-span-4 bg-white/5 border-white/10">
           <CardHeader>
             <CardTitle className="text-white">Recent Transactions</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-white/50 text-sm text-center py-10 italic">
               No recent transactions to display.
             </div>
           </CardContent>
         </Card>
         <Card className="col-span-3 bg-white/5 border-white/10">
           <CardHeader>
             <CardTitle className="text-white">Upcoming Tasks</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-white/50 text-sm text-center py-10 italic">
               No upcoming tasks. Enjoy your day!
             </div>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}

import { Shield, Package, Users, DollarSign, MessageSquare, BarChart3, Settings, AlertCircle, CheckCircle, Clock, TrendingUp, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminQuickReference = () => {
  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Admin Quick Reference Guide</h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Essential information and quick actions for platform administrators
          </p>
        </div>

        <div className="space-y-8">
          {/* Quick Stats Overview */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              Dashboard Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-blue-900">Total Users</h3>
                <p className="text-sm text-blue-700 mt-1">All registered users across all roles</p>
                <Link to="/admin-dashboard/users" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
                  Manage Users →
                </Link>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5">
                <Package className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold text-green-900">Total Products</h3>
                <p className="text-sm text-green-700 mt-1">Active products in the catalog</p>
                <Link to="/admin-dashboard/products" className="text-xs text-green-600 hover:text-green-800 mt-2 inline-block">
                  Manage Products →
                </Link>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-5">
                <DollarSign className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-semibold text-purple-900">Total Revenue</h3>
                <p className="text-sm text-purple-700 mt-1">All-time platform revenue</p>
                <Link to="/admin-dashboard/payouts" className="text-xs text-purple-600 hover:text-purple-800 mt-2 inline-block">
                  View Settlements →
                </Link>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-5">
                <FileText className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-primary-900">Total Orders</h3>
                <p className="text-sm text-blue-700 mt-1">All orders on the platform</p>
                <Link to="/admin-dashboard/orders" className="text-xs text-blue-600 hover:text-primary-800 mt-2 inline-block">
                  Manage Orders →
                </Link>
              </div>
            </div>
          </section>

          {/* Key Responsibilities */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-600" />
              Key Responsibilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  User Management
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Approve/reject vendor registration requests</li>
                  <li>• Manage user accounts and roles</li>
                  <li>• Handle user complaints and disputes</li>
                  <li>• Monitor user activity and behavior</li>
                </ul>
                <Link to="/admin-dashboard/users" className="text-sm text-blue-600 hover:text-blue-700 mt-3 inline-block font-medium">
                  Go to User Management →
                </Link>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  Product Management
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Review and approve product listings</li>
                  <li>• Manage product categories</li>
                  <li>• Remove inappropriate content</li>
                  <li>• Ensure product quality standards</li>
                </ul>
                <Link to="/admin-dashboard/products" className="text-sm text-blue-600 hover:text-blue-700 mt-3 inline-block font-medium">
                  Go to Product Management →
                </Link>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Order Management
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Monitor order processing and fulfillment</li>
                  <li>• Handle order disputes and refunds</li>
                  <li>• Track delivery status across vendors</li>
                  <li>• Resolve payment issues</li>
                </ul>
                <Link to="/admin-dashboard/orders" className="text-sm text-blue-600 hover:text-blue-700 mt-3 inline-block font-medium">
                  Go to Order Management →
                </Link>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  Financial Management
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Approve vendor commission settlements</li>
                  <li>• Approve affiliate commission payouts</li>
                  <li>• Monitor platform revenue and fees</li>
                  <li>• Generate financial reports</li>
                </ul>
                <Link to="/admin-dashboard/payouts" className="text-sm text-blue-600 hover:text-blue-700 mt-3 inline-block font-medium">
                  Go to Settlements →
                </Link>
              </div>
            </div>

            {/* Role Switching Warning */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 mt-6">
              <h4 className="font-semibold text-orange-900 mb-3 text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ⚠️ Critical: Role Switching Limitations
              </h4>
              <p className="text-orange-800 mb-3">
                The platform currently supports <strong>ONE role per user</strong>. When users switch roles (e.g., Affiliate → Vendor), they experience <strong>destructive data loss</strong>:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-orange-300 rounded p-4">
                  <p className="font-semibold text-orange-900 mb-2">Affiliate → Vendor:</p>
                  <ul className="space-y-1 text-sm text-orange-800">
                    <li>❌ Loses affiliate dashboard access</li>
                    <li>❌ Pending commissions may be lost</li>
                    <li>❌ All affiliate links deactivated</li>
                    <li>❌ Performance history deleted</li>
                  </ul>
                </div>
                <div className="bg-white border border-orange-300 rounded p-4">
                  <p className="font-semibold text-orange-900 mb-2">Vendor → Affiliate:</p>
                  <ul className="space-y-1 text-sm text-orange-800">
                    <li>❌ Loses vendor dashboard access</li>
                    <li>❌ All products unpublished</li>
                    <li>❌ Pending settlements may be lost</li>
                    <li>❌ Cannot fulfill existing orders</li>
                    <li>❌ Sponsored ads campaigns lost</li>
                  </ul>
                </div>
              </div>
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                <p className="text-sm text-red-900 mb-2">
                  <strong>⚠️ Admin Action Required:</strong>
                </p>
                <ul className="space-y-1 text-sm text-red-800">
                  <li>• <strong>Warning system added:</strong> BecomeVendor/BecomeAffiliate pages now show destructive warnings</li>
                  <li>• <strong>Confirmation required:</strong> Users must check confirmation box to proceed</li>
                  <li>• <strong>Multi-role requests:</strong> If users want BOTH roles, contact dev team for manual configuration</li>
                  <li>• <strong>Admin role:</strong> Should NEVER be granted via public application (employees only)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Common Tasks */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-7 h-7 text-green-600" />
              Common Daily Tasks
            </h2>

            <div className="space-y-6">
              {/* Vendor Approvals */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3 text-lg">1. Approve Vendor Registrations</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-blue-200 rounded p-4">
                    <p className="text-sm text-gray-700 mb-2"><strong>Steps:</strong></p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Go to Admin Dashboard → Users Management</li>
                      <li>Filter by Role: "Vendor" and Status: "Pending"</li>
                      <li>Review vendor business details and documents</li>
                      <li>Click "Approve" or "Reject" with reason</li>
                    </ol>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-blue-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p><strong>Best Practice:</strong> Verify business details, GST numbers, and product categories before approval</p>
                  </div>
                </div>
              </div>

              {/* Commission Approvals */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-3 text-lg">2. Approve Commission Settlements</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-green-200 rounded p-4">
                    <p className="text-sm text-gray-700 mb-2"><strong>For Vendors:</strong></p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Go to Admin → Settlements</li>
                      <li>Review "Pending Approval" settlements</li>
                      <li>Verify order was delivered successfully</li>
                      <li>Approve settlement (vendor gets paid 85% of sale)</li>
                    </ol>
                  </div>
                  <div className="bg-white border border-green-200 rounded p-4">
                    <p className="text-sm text-gray-700 mb-2"><strong>For Affiliates:</strong></p>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Go to Admin → Affiliate Commissions</li>
                      <li>Review monthly commission totals</li>
                      <li>Approve commissions above ₹500 threshold</li>
                      <li>Process monthly payouts by month-end</li>
                    </ol>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-green-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p><strong>Commission Rates:</strong> Vendors get 85% (platform takes 15%), Affiliates get 5-8% based on tier</p>
                  </div>
                </div>
              </div>

              {/* Product Review */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="font-semibold text-purple-900 mb-3 text-lg">3. Review Product Listings</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-purple-200 rounded p-4">
                    <p className="text-sm text-gray-700 mb-2"><strong>Quality Checks:</strong></p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>Verify product images are clear and appropriate</li>
                      <li>Check descriptions are accurate and complete</li>
                      <li>Ensure pricing is reasonable and competitive</li>
                      <li>Confirm correct category and attributes</li>
                      <li>Check for prohibited or restricted items</li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-purple-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p><strong>Action:</strong> Unpublish products that violate policies and notify vendor</p>
                  </div>
                </div>
              </div>

              {/* Order Monitoring */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-semibold text-orange-900 mb-3 text-lg">4. Monitor Order Issues</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-orange-200 rounded p-4">
                    <p className="text-sm text-gray-700 mb-2"><strong>Watch For:</strong></p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>Orders pending for &gt;24 hours without processing</li>
                      <li>Customer complaints and support tickets</li>
                      <li>Delivery delays beyond expected timeline</li>
                      <li>Refund and return requests</li>
                      <li>Payment failures or disputes</li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-orange-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p><strong>Escalation:</strong> Contact vendors for delayed orders; process refunds if unresolved &gt;7 days</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Commission Reference */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-green-600" />
              Commission Structure Reference
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vendor Commissions */}
              <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50">
                <h3 className="font-bold text-green-900 mb-4 text-lg">Vendor Commissions</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-green-300 rounded p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Default Rate: 15% Platform Fee</p>
                    <p className="text-xs text-gray-700 mb-3">Vendor keeps 85% of each sale</p>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs text-gray-700 font-semibold mb-1">Example:</p>
                      <div className="text-xs text-gray-700 space-y-1">
                        <p>Product sold for: ₹10,000</p>
                        <p className="text-green-700 font-semibold">→ Vendor gets: ₹8,500</p>
                        <p className="text-blue-700 font-semibold">→ Platform fee: ₹1,500</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                    <p className="text-xs text-yellow-900">
                      <strong>Variable Rates:</strong> Can be 12-20% depending on product category
                    </p>
                  </div>
                </div>
              </div>

              {/* Affiliate Commissions */}
              <div className="border-2 border-purple-300 rounded-lg p-6 bg-purple-50">
                <h3 className="font-bold text-purple-900 mb-4 text-lg">Affiliate Commissions</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-purple-300 rounded p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Tier-Based Rates:</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                        <span className="text-gray-700">🥉 Bronze (₹10K+/mo)</span>
                        <span className="font-bold text-amber-700">5%</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <span className="text-gray-700">🥈 Silver (₹25K+/mo)</span>
                        <span className="font-bold text-gray-700">6%</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-gray-700">🥇 Gold (₹50K+/mo)</span>
                        <span className="font-bold text-yellow-700">7%</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-purple-100 rounded">
                        <span className="text-gray-700">💎 Platinum (₹100K+/mo)</span>
                        <span className="font-bold text-purple-700">8%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-300 rounded p-3">
                    <p className="text-xs text-blue-900">
                      <strong>Payment:</strong> Monthly, ₹500 minimum threshold
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-5 mt-6">
              <h4 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Commission Lifecycle
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-3">
                <div className="bg-white border border-primary-200 rounded p-3">
                  <p className="font-semibold text-primary-900 mb-1">1. Created</p>
                  <p className="text-xs text-blue-700">When order is placed</p>
                </div>
                <div className="bg-white border border-primary-200 rounded p-3">
                  <p className="font-semibold text-primary-900 mb-1">2. Approved (Admin)</p>
                  <p className="text-xs text-blue-700">After successful delivery</p>
                </div>
                <div className="bg-white border border-primary-200 rounded p-3">
                  <p className="font-semibold text-primary-900 mb-1">3. Paid</p>
                  <p className="text-xs text-blue-700">Transferred to recipient</p>
                </div>
              </div>
            </div>
          </section>

          {/* Sponsored Ads Management */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              Sponsored Ads Management
            </h2>

            <div className="space-y-4">
              <p className="text-gray-700">
                Vendors can create sponsored ad campaigns to promote their products in premium positions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <h4 className="font-semibold text-blue-900 mb-2">CPC (Cost Per Click)</h4>
                  <p className="text-sm text-blue-800 mb-2">Vendor pays for each click on the ad</p>
                  <p className="text-xs text-blue-700">Best for: Brand awareness</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-2">CPM (Cost Per 1000 Views)</h4>
                  <p className="text-sm text-green-800 mb-2">Vendor pays per 1000 impressions</p>
                  <p className="text-xs text-green-700">Best for: Mass exposure</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-2">CPA (Cost Per Sale)</h4>
                  <p className="text-sm text-purple-800 mb-2">Vendor pays only when sale occurs</p>
                  <p className="text-xs text-purple-700">Best for: Performance marketing</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                <h4 className="font-semibold text-yellow-900 mb-3">Ad Placements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-yellow-800">
                  <div>• Homepage Hero Banner (top)</div>
                  <div>• Homepage Sidebar</div>
                  <div>• Category Page Top</div>
                  <div>• Category Page Sidebar</div>
                  <div>• Search Results Top</div>
                  <div>• Product Page Sidebar</div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-300 rounded-lg p-5">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Admin Controls
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Review and approve ad campaigns before they go live</li>
                  <li>• Monitor ad performance and budget spending</li>
                  <li>• Pause or stop campaigns that violate policies</li>
                  <li>• Set minimum daily budgets (typically ₹500+)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Important Policies */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertCircle className="w-7 h-7 text-red-600" />
              Important Platform Policies
            </h2>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                <h3 className="font-semibold text-red-900 mb-3">Prohibited Products</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-red-800">
                  <div>❌ Counterfeit or fake products</div>
                  <div>❌ Weapons or explosives</div>
                  <div>❌ Illegal drugs or substances</div>
                  <div>❌ Adult content or services</div>
                  <div>❌ Stolen goods</div>
                  <div>❌ Restricted medical devices</div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <h3 className="font-semibold text-orange-900 mb-3">Vendor Requirements</h3>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li>• Must have valid business registration/GST</li>
                  <li>• Must ship orders within 2-3 business days</li>
                  <li>• Must maintain 4+ star average rating</li>
                  <li>• Must respond to customer inquiries within 24 hours</li>
                  <li>• Approval required before selling on platform</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <h3 className="font-semibold text-blue-900 mb-3">Return & Refund Policy</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• 30-day return window for most products</li>
                  <li>• Free return pickup for defective items</li>
                  <li>• Refunds processed within 5-7 business days</li>
                  <li>• Vendors responsible for return shipping costs on defects</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quick Admin Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/admin-dashboard/users" className="bg-white border-2 border-primary-200 rounded-lg p-6 hover:border-primary-400 hover:shadow-lg transition-all text-center group">
                <Users className="w-10 h-10 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900 mb-1">User Management</h3>
                <p className="text-sm text-gray-700">Manage all user accounts</p>
              </Link>
              <Link to="/admin-dashboard/products" className="bg-white border-2 border-green-200 rounded-lg p-6 hover:border-green-400 hover:shadow-lg transition-all text-center group">
                <Package className="w-10 h-10 text-green-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900 mb-1">Product Management</h3>
                <p className="text-sm text-gray-700">Review product listings</p>
              </Link>
              <Link to="/admin-dashboard/orders" className="bg-white border-2 border-orange-200 rounded-lg p-6 hover:border-orange-400 hover:shadow-lg transition-all text-center group">
                <FileText className="w-10 h-10 text-orange-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900 mb-1">Order Management</h3>
                <p className="text-sm text-gray-700">Monitor all orders</p>
              </Link>
              <Link to="/admin-dashboard/payouts" className="bg-white border-2 border-purple-200 rounded-lg p-6 hover:border-purple-400 hover:shadow-lg transition-all text-center group">
                <DollarSign className="w-10 h-10 text-purple-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900 mb-1">Settlements</h3>
                <p className="text-sm text-gray-700">Approve vendor payouts</p>
              </Link>
              <Link to="/admin-dashboard/ads" className="bg-white border-2 border-blue-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all text-center group">
                <BarChart3 className="w-10 h-10 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900 mb-1">Sponsored Ads</h3>
                <p className="text-sm text-gray-700">Manage ad campaigns</p>
              </Link>
              <Link to="/admin-dashboard/communications" className="bg-white border-2 border-indigo-200 rounded-lg p-6 hover:border-indigo-400 hover:shadow-lg transition-all text-center group">
                <MessageSquare className="w-10 h-10 text-indigo-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900 mb-1">Communications</h3>
                <p className="text-sm text-gray-700">User messages & support</p>
              </Link>
            </div>
          </section>

          {/* Support */}
          <section className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Technical Support?</h2>
            <p className="text-gray-700 mb-6">
              For platform technical issues or questions about admin features
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:ledvtech@gmail.com" className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium">
                Contact Support
              </a>
              <Link to="/page/faq" className="inline-block bg-white text-blue-600 border-2 border-primary-600 px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors font-medium">
                View FAQ
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminQuickReference;
